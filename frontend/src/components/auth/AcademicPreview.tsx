import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUpRight, BookOpen, CalendarDays, Check, Focus, TrendingUp } from 'lucide-react';
import './AcademicPreview.css';

const steps = [
  { label: 'Organizar', icon: CalendarDays },
  { label: 'Focar', icon: Focus },
  { label: 'Evoluir', icon: TrendingUp },
] as const;

const exampleWeek = [
  { day: 'Seg', kind: 'Aula', title: 'Algoritmos', detail: '08:00 — 09:40', tone: 'class' },
  { day: 'Ter', kind: 'Estudo', title: 'Revisar listas', detail: '14:00 — 14:50', tone: 'study' },
  { day: 'Qua', kind: 'Entrega', title: 'Lista de exercícios', detail: 'Prazo do dia', tone: 'deadline' },
] as const;

function OrganizePreview() {
  return (
    <>
      <div className="academic-preview__panel-heading">
        <span className="academic-preview__eyebrow">Intenção → agenda</span>
        <h3>O que vem primeiro ganha espaço.</h3>
      </div>
      <div className="academic-preview__week" aria-label="Exemplo de agenda de três dias">
        {exampleWeek.map((entry) => (
          <div key={entry.day} className="academic-preview__day" data-tone={entry.tone}>
            <span className="academic-preview__day-name">{entry.day}</span>
            <div className="academic-preview__day-entry">
              <span className="academic-preview__entry-kind">{entry.kind}</span>
              <strong>{entry.title}</strong>
              <span className="academic-preview__entry-detail">{entry.detail}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="academic-preview__annotation">
        <ArrowUpRight size={17} aria-hidden="true" />
        <p>Aulas, prazos e blocos de estudo, na mesma visão da semana.</p>
      </div>
    </>
  );
}

function FocusPreview() {
  return (
    <>
      <div className="academic-preview__panel-heading">
        <span className="academic-preview__eyebrow">Agenda → atenção</span>
        <h3>Agora, uma coisa de cada vez.</h3>
      </div>
      <div className="academic-preview__focus">
        <div className="academic-preview__focus-mark" aria-hidden="true">
          <svg viewBox="0 0 112 112" focusable="false">
            <circle className="academic-preview__focus-track" cx="56" cy="56" r="46" />
            <path className="academic-preview__draw-line" d="M56 10 A46 46 0 0 1 102 56" />
            <path d="M56 0V17 M112 56H95 M56 112V95 M0 56H17" />
          </svg>
          <BookOpen size={31} strokeWidth={1.25} />
        </div>
        <div className="academic-preview__focus-content">
          <span className="academic-preview__entry-kind">Bloco de estudo</span>
          <strong>Revisar listas<br />de algoritmos</strong>
          <span className="academic-preview__focus-status"><Check size={13} aria-hidden="true" /> Uma tarefa escolhida</span>
        </div>
      </div>
      <div className="academic-preview__annotation">
        <ArrowUpRight size={17} aria-hidden="true" />
        <p>Entre em foco. Ao concluir, registre o tempo que você estudou.</p>
      </div>
    </>
  );
}

function EvolvePreview() {
  return (
    <>
      <div className="academic-preview__panel-heading">
        <span className="academic-preview__eyebrow">Atenção → aprendizado</span>
        <h3>Seu ritmo começa a fazer sentido.</h3>
      </div>
      <div className="academic-preview__journey">
        <svg viewBox="0 0 300 44" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="academic-preview__journey-track" d="M22 31 C72 31 75 12 150 12 S225 31 278 31" />
          <path className="academic-preview__draw-line" d="M22 31 C72 31 75 12 150 12 S225 31 278 31" />
          <circle cx="22" cy="31" r="4" /><circle cx="150" cy="12" r="4" /><circle cx="278" cy="31" r="4" />
        </svg>
        <ol>
          <li><strong>Planejar</strong><span>Definir o próximo passo</span></li>
          <li><strong>Estudar</strong><span>Registrar a experiência</span></li>
          <li><strong>Revisar</strong><span>Ajustar a próxima semana</span></li>
        </ol>
      </div>
      <div className="academic-preview__annotation">
        <ArrowUpRight size={17} aria-hidden="true" />
        <p>Seu histórico revela padrões para planejar com mais clareza.</p>
      </div>
    </>
  );
}

const previews = [OrganizePreview, FocusPreview, EvolvePreview] as const;

/** Interactive product illustration. It never reads or changes academic data. */
export function AcademicPreview({ className = '' }: { className?: string }) {
  const [activeStep, setActiveStep] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight': nextIndex = (index + 1) % steps.length; break;
      case 'ArrowLeft': nextIndex = (index + steps.length - 1) % steps.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = steps.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setActiveStep(nextIndex);
    tabs.current[nextIndex]?.focus();
  }

  return (
    <section className={`academic-preview ${className}`} aria-label="Conheça o EduTrack com uma prévia ilustrativa">
      <div className="academic-preview__masthead">
        <span>Caderno de estudos</span>
        <span className="academic-preview__illustration-label">Prévia ilustrativa</span>
      </div>
      <div className="academic-preview__tabs" role="tablist" aria-label="Explore o EduTrack">
        {steps.map(({ label, icon: Icon }, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={activeStep === index}
            tabIndex={activeStep === index ? 0 : -1}
            ref={(element) => { tabs.current[index] = element; }}
            onClick={() => setActiveStep(index)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <span className="academic-preview__tab-index">0{index + 1}</span>
            <Icon size={15} strokeWidth={1.6} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="academic-preview__pages">
        {previews.map((Preview, index) => (
          <div
            key={steps[index].label}
            className="academic-preview__panel"
            role="tabpanel"
            id={`${id}-panel-${index}`}
            aria-labelledby={`${id}-tab-${index}`}
            hidden={activeStep !== index}
            tabIndex={0}
          >
            <Preview />
          </div>
        ))}
      </div>
      <p className="academic-preview__caption">Explore as etapas. Seu semestre começa com um próximo passo.</p>
    </section>
  );
}
