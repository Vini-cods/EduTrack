"""Análise determinística dos dados reais, sem inventar histórico de conclusões.

Task continua sendo a intenção, CalendarEvent a alocação e StudySession a
execução. A estimativa ainda não coberta por execução/blocos futuros é
distribuída no prazo; atrasos entram em hoje. Não há tabela derivada que
precise sincronizar nem uma segunda cópia das tarefas no calendário.
"""

from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

from app.models.calendar_event import CalendarEvent, EventCategory
from app.models.study_session import StudySession, StudySessionStatus
from app.models.subject import Subject
from app.models.task import Task
from app.schemas.analytics import AnalyticsDay, AnalyticsInsight, AnalyticsPeriod, AnalyticsResponse, AnalyticsSubject, AnalyticsSummary, LoadMetrics
from app.services.analytics_metrics import StudyRecord, compare_study, planning_diagnostics, session_patterns

MAX_PERIOD_DAYS = 93
MINUTE_FIELDS = ("studied_minutes", "planned_study_minutes", "scheduled_minutes", "unallocated_task_minutes")


class AnalyticsValidationError(ValueError):
    pass


def _utc(value: datetime) -> datetime:
    """StudySession usa UTC; SQLite remove tzinfo ao devolver a coluna."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _calendar_local(value: datetime, zone: ZoneInfo) -> datetime:
    """A agenda existente usa hora civil dos formulários datetime-local."""
    return value.replace(tzinfo=zone) if value.tzinfo is None else value.astimezone(zone)


def _rate(part: float, total: float) -> float:
    return round(part / total * 100, 1) if total > 0 else 0.0


def _finish_load(item: LoadMetrics) -> None:
    for field in MINUTE_FIELDS:
        setattr(item, field, round(getattr(item, field), 2))
    item.total_load_minutes = round(item.scheduled_minutes + item.unallocated_task_minutes, 2)


def _event_minutes_by_day(event: CalendarEvent, start: date, end: date, zone: ZoneInfo):
    """Divide blocos que atravessam a meia-noite, sem inventar duração para instantes."""
    if event.end_datetime is None:
        return
    event_start = _calendar_local(event.start_datetime, zone)
    event_end = _calendar_local(event.end_datetime, zone)
    cursor = max(event_start.date(), start)
    last = min(event_end.date(), end)
    while cursor <= last:
        day_start = datetime.combine(cursor, time.min, tzinfo=zone)
        day_end = datetime.combine(cursor + timedelta(days=1), time.min, tzinfo=zone)
        overlap_start = max(event_start, day_start)
        overlap_end = min(event_end, day_end)
        minutes = max(0, (overlap_end.astimezone(timezone.utc) - overlap_start.astimezone(timezone.utc)).total_seconds() / 60)
        if minutes:
            yield cursor, minutes
        cursor += timedelta(days=1)


def _insights(summary: AnalyticsSummary, days: list[AnalyticsDay]) -> list[AnalyticsInsight]:
    result: list[AnalyticsInsight] = []
    overloaded = [day for day in days if day.load_percent > 100]
    if overloaded:
        peak = max(overloaded, key=lambda day: day.total_load_minutes)
        result.append(AnalyticsInsight(id="overload", tone="warning", title="Redistribua a carga",
            description=f"{len(overloaded)} dia(s) superam sua capacidade. Em {peak.date.strftime('%d/%m')}, a carga prevista é de {peak.total_load_minutes / 60:.1f} h.", action="academic_load"))
    if summary.overdue_tasks:
        result.append(AnalyticsInsight(id="overdue", tone="warning", title="Prazos precisam de atenção",
            description=f"Você tem {summary.overdue_tasks} tarefa(s) aberta(s) com prazo vencido. Revise a prioridade e renegocie o que não couber.", action="tasks"))
    if summary.unallocated_task_minutes:
        result.append(AnalyticsInsight(id="unallocated", tone="info", title="Transforme estimativas em blocos",
            description=f"Há {summary.unallocated_task_minutes / 60:.1f} h estimada(s) no período ainda sem um bloco de estudo futuro que as cubra.", action="planner"))
    if summary.unknown_estimate_tasks:
        result.append(AnalyticsInsight(id="missing-estimates", tone="info", title="Complete as estimativas",
            description=f"{summary.unknown_estimate_tasks} tarefa(s) aberta(s) não têm duração estimada. A carga exibida pode estar abaixo do esforço necessário.", action="tasks"))
    if summary.undated_tasks:
        result.append(AnalyticsInsight(id="undated", tone="info", title="Dê um prazo às tarefas",
            description=f"{summary.undated_tasks} tarefa(s) aberta(s) sem prazo não entram na distribuição diária de estimativas.", action="tasks"))
    if summary.completed_sessions:
        result.append(AnalyticsInsight(id="study-record", tone="success", title="Seu estudo está registrado",
            description=f"{summary.studied_minutes / 60:.1f} h em {summary.completed_sessions} sessão(ões) concluída(s), distribuída(s) em {summary.active_days} dia(s).", action="focus"))
    elif not result:
        result.append(AnalyticsInsight(id="start-recording", tone="info", title="Comece a construir seu histórico",
            description="Finalize uma sessão no Focus e cadastre os próximos prazos para acompanhar estudo realizado e carga prevista.", action="focus"))
    return result


def get_analytics(db: Session, user_id: int, start_date: date, end_date: date,
                  timezone_name: str = "America/Sao_Paulo", daily_capacity_hours: float = 6,
                  now: datetime | None = None) -> AnalyticsResponse:
    day_count = (end_date - start_date).days + 1
    if not 1 <= day_count <= MAX_PERIOD_DAYS:
        raise AnalyticsValidationError("Use um intervalo de 1 a 93 dias, com fim igual ou posterior ao início")
    try:
        zone = ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise AnalyticsValidationError("Fuso horário inválido; use um identificador IANA, como America/Sao_Paulo") from exc
    now = _utc(now or datetime.now(timezone.utc))
    today = now.astimezone(zone).date()
    daily_capacity = daily_capacity_hours * 60
    days = {start_date + timedelta(days=index): AnalyticsDay(date=start_date + timedelta(days=index), capacity_minutes=daily_capacity)
            for index in range(day_count)}
    subjects = db.query(Subject).filter(Subject.user_id == user_id).all()
    by_subject = {subject.id: AnalyticsSubject(subject_id=subject.id, subject_name=subject.name, subject_color=subject.color)
                  for subject in subjects}

    def subject_metrics(subject_id: int | None) -> AnalyticsSubject:
        # O fallback não expõe metadados de uma eventual referência inválida/antiga.
        if subject_id not in by_subject:
            if None not in by_subject:
                by_subject[None] = AnalyticsSubject(subject_id=None, subject_name="Sem disciplina")
            return by_subject[None]
        return by_subject[subject_id]

    # Quatro consultas de dados, independentemente do número de disciplinas.
    # Todas filtram o proprietário; o histórico completo cobre estimativas
    # restantes mesmo quando parte da execução aconteceu antes do período.
    tasks = db.query(Task).filter(Task.user_id == user_id).all()
    events = db.query(CalendarEvent).filter(CalendarEvent.user_id == user_id).all()
    sessions = db.query(StudySession).filter(StudySession.user_id == user_id, StudySession.status == StudySessionStatus.CONCLUIDA).all()
    actual_task_minutes: dict[int, float] = defaultdict(float)
    allocated_task_minutes: dict[int, float] = defaultdict(float)
    summary = AnalyticsSummary(capacity_minutes=daily_capacity * day_count)
    study_records: list[StudyRecord] = []
    task_effort: list[tuple[float, float]] = []

    for session in sessions:
        # Uma execução datada no futuro não é evidência de estudo realizado.
        if _utc(session.started_at) > now or (session.ended_at is not None and _utc(session.ended_at) > now):
            continue
        minutes = max(0, session.accumulated_seconds) / 60
        local_start = _utc(session.started_at).astimezone(zone)
        study_records.append(StudyRecord(started_at=local_start, minutes=minutes))
        if session.task_id is not None:
            actual_task_minutes[session.task_id] += minutes
        session_day = local_start.date()
        if session_day in days:
            days[session_day].studied_minutes += minutes
            subject_metrics(session.subject_id).studied_minutes += minutes
            summary.completed_sessions += 1

    for event in events:
        for event_day, minutes in _event_minutes_by_day(event, start_date, end_date, zone):
            day = days[event_day]
            subject = subject_metrics(event.subject_id)
            day.scheduled_minutes += minutes
            subject.scheduled_minutes += minutes
            if event.category == EventCategory.ESTUDO:
                day.planned_study_minutes += minutes
                subject.planned_study_minutes += minutes
        if event.category == EventCategory.ESTUDO and event.task_id is not None and event.end_datetime is not None:
            event_start = _calendar_local(event.start_datetime, zone).astimezone(timezone.utc)
            event_end = _calendar_local(event.end_datetime, zone).astimezone(timezone.utc)
            allocated_task_minutes[event.task_id] += max(0, (event_end - max(now, event_start)).total_seconds() / 60)

    for task in tasks:
        completed = task.status == "concluida"
        if task.due_date in days:
            day = days[task.due_date]
            subject = subject_metrics(task.subject_id)
            day.tasks_due += 1
            subject.tasks_due += 1
            if completed:
                day.tasks_completed += 1
                subject.tasks_completed += 1
        if completed:
            continue
        summary.open_tasks += 1
        summary.overdue_tasks += int(task.due_date is not None and task.due_date < today)
        summary.unknown_estimate_tasks += int(task.estimated_hours is None)
        summary.undated_tasks += int(task.due_date is None)
        if task.estimated_hours is None or task.due_date is None:
            continue
        load_day = max(task.due_date, today)
        if load_day in days:
            remaining_effort = max(0, task.estimated_hours * 60 - actual_task_minutes[task.id])
            covered_effort = min(remaining_effort, allocated_task_minutes[task.id])
            task_effort.append((remaining_effort, covered_effort))
            remainder = remaining_effort - covered_effort
            days[load_day].unallocated_task_minutes += remainder
            subject_metrics(task.subject_id).unallocated_task_minutes += remainder

    for day in days.values():
        _finish_load(day)
        day.load_percent = _rate(day.total_load_minutes, day.capacity_minutes)
        for field in (*MINUTE_FIELDS, "tasks_due", "tasks_completed"):
            setattr(summary, field, getattr(summary, field) + getattr(day, field))
    _finish_load(summary)
    summary.active_days = sum(day.studied_minutes > 0 for day in days.values())
    elapsed_days = max(0, (min(today, end_date) - start_date).days + 1)
    summary.consistency_percent = _rate(summary.active_days, elapsed_days)
    summary.completion_rate = _rate(summary.tasks_completed, summary.tasks_due)
    summary.load_percent = _rate(summary.total_load_minutes, summary.capacity_minutes)
    for subject in by_subject.values():
        _finish_load(subject)
        subject.completion_rate = _rate(subject.tasks_completed, subject.tasks_due)

    comparison = compare_study(study_records, start_date, end_date, today)
    patterns = session_patterns(study_records, start_date, end_date, today)
    diagnostics = planning_diagnostics(list(days.values()), task_effort, summary.unknown_estimate_tasks, summary.undated_tasks)
    insights = _insights(summary, list(days.values()))
    if comparison.available and comparison.previous_studied_minutes > 0 and comparison.delta_minutes < 0:
        insights.append(AnalyticsInsight(
            id="study-comparison", tone="info", title="Revisite seu plano de estudo",
            description=f"Foram {abs(comparison.delta_minutes):.0f} min a menos de estudo registrado em {comparison.elapsed_days} dia(s), comparados ao mesmo trecho do período anterior. Confira se os próximos blocos cabem na sua rotina.",
            action="planner",
        ))

    return AnalyticsResponse(
        period=AnalyticsPeriod(start_date=start_date, end_date=end_date, timezone=timezone_name,
                               daily_capacity_hours=daily_capacity_hours, as_of=now),
        summary=summary, daily=list(days.values()),
        comparison=comparison, session_patterns=patterns, planning_diagnostics=diagnostics,
        subjects=sorted(by_subject.values(), key=lambda item: (-item.total_load_minutes, -item.studied_minutes, item.subject_name.casefold())),
        insights=insights,
        methodology=[
            "Estudo realizado soma apenas sessões concluídas, sem pausas, atribuído ao dia local de início. O modelo atual não registra segmentos para repartir sessões entre dias.",
            "Conclusão mede o estado atual das tarefas cujo prazo está no período. Não representa conclusões históricas: tarefas ainda não possuem data de conclusão.",
            "Carga prevista soma a duração dos eventos com a estimativa restante das tarefas abertas, descontando estudo concluído e blocos futuros vinculados. Estimativas sem prazo não são distribuídas.",
            "A estimativa não alocada entra no dia do prazo; tarefas atrasadas entram em hoje. Eventos sem horário final não recebem uma duração presumida.",
            "Consistência é a proporção de dias já transcorridos do período com estudo concluído. Dias futuros não entram no denominador.",
            "A agenda existente usa horário local; sessões de execução usam UTC, convertido para o fuso selecionado. Capacidade diária é uma referência configurável, não uma recomendação de saúde.",
            "Comparação usa apenas estudo: o período anterior começa uma janela selecionada antes, comparando a mesma quantidade de dias já transcorridos. O dia atual é parcial; os demais dias comparados são completos. Datas dos dois trechos são explícitas e base zero não gera variação percentual.",
            "Padrões usam sessões concluídas até o instante da consulta, agrupadas pelo início local. Sessões com início ou conclusão no futuro são desconsideradas. Distribuições não medem eficiência nem recomendam horários.",
            "Sequências contam dias consecutivos com estudo positivo dentro do intervalo. A sequência atual termina no último dia transcorrido; quando esse dia é hoje sem estudo, pode terminar ontem. A maior sequência também é limitada ao intervalo.",
            "Cobertura considera esforço restante das tarefas abertas com prazo distribuído no intervalo, descontando estudo registrado; blocos futuros vinculados são limitados ao restante de cada tarefa, mesmo fora da janela. Sem esforço restante, a cobertura é indisponível. Estimativas ausentes e tarefas sem prazo referem-se a todo o backlog aberto.",
        ],
    )
