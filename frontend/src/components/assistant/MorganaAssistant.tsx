import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUp, BookOpen, CalendarDays, Check, ChevronRight, CircleAlert, EyeOff, LoaderCircle, Pause, Play, RefreshCw, Square, Target, Trash2, X } from 'lucide-react';
import { useAssistant } from '../../hooks/useAssistant';
import { useMorganaCompanion } from '../../hooks/useMorganaCompanion';
import { ASSISTANT_MESSAGE_LIMIT, assistantSourcePath } from '../../lib/assistant';
import type { AssistantMessage } from '../../lib/assistant';
import { MorganaPet } from './MorganaPet';
import './MorganaAssistant.css';

const prompts = [
  { icon: Target, label: 'Por onde começo hoje?', text: 'O que devo priorizar hoje? Considere prazos, prioridades e estimativas das minhas tarefas.' },
  { icon: CalendarDays, label: 'Organizar minha semana', text: 'Me ajude a montar um plano de estudos para esta semana, considerando minhas tarefas e meus compromissos. Aponte o que ainda preciso informar.' },
  { icon: BookOpen, label: 'Preparar uma revisão', text: 'Quero me preparar para a próxima prova. Veja se há uma no meu calendário e me ajude a estruturar uma revisão. Pergunte o conteúdo que você não conhece.' },
];

function ConversationMessage({ message, onNavigate }: { message: AssistantMessage; onNavigate: () => void }) {
  const sourceLinks = message.sources?.flatMap(source => {
    const path = assistantSourcePath(source);
    return path ? [{ ...source, path }] : [];
  });
  return (
    <article className={`morgana-message morgana-message--${message.role}`}>
      <span className="morgana-message-author">{message.role === 'user' ? 'Você' : 'Morgana'}</span>
      <p>{message.content}</p>
      {message.context && <details className="morgana-context-details">
        <summary>Contexto consultado <ChevronRight size={12} aria-hidden="true" /></summary>
        <p>{message.context.tasks_included} tarefas · {message.context.events_included} compromissos · {message.context.subjects_included} disciplinas.</p>
        <p>{message.context.truncated ? 'Resumo parcial: alguns registros ficaram fora do limite de contexto.' : 'Resumo dos dados disponíveis no momento da pergunta.'} Fuso: {message.context.timezone}.</p>
        {sourceLinks && sourceLinks.length > 0 && <div className="morgana-source-links">
          {sourceLinks.map(source => <Link key={`${source.kind}-${source.id}`} to={source.path} onClick={onNavigate}>{source.label}<ChevronRight size={11} aria-hidden="true" /></Link>)}
        </div>}
      </details>}
    </article>
  );
}

export function MorganaAssistant() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const assistant = useAssistant(open);
  const location = useLocation();
  const panelId = useId();
  const titleId = useId();
  const inputId = useId();
  const privacyId = useId();
  const movementHintId = useId();
  const launcher = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const quiet = location.pathname === '/study/focus';
  const companion = useMorganaCompanion(location.pathname, open);
  const { messages, pendingMessage, busy, error, status, statusLoading, statusError } = assistant;
  const lastReplyId = messages.at(-1)?.id;

  useEffect(() => {
    setSpeaking(lastReplyId !== undefined);
    const timer = setTimeout(() => setSpeaking(false), 1800);
    return () => clearTimeout(timer);
  }, [lastReplyId]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => (status?.configured ? input.current : closeButton.current)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, status?.configured]);

  useEffect(() => {
    if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [messages, pendingMessage, busy, error, open]);

  const close = () => {
    if (busy) assistant.cancel();
    setOpen(false);
    requestAnimationFrame(() => launcher.current?.focus());
  };

  const submit = async () => {
    const sent = draft;
    if (await assistant.send(sent)) setDraft(current => current === sent ? '' : current);
  };

  return (
    <div className={`morgana-assistant ${quiet ? 'morgana-assistant--quiet' : ''} ${!open ? 'morgana-assistant--free' : ''} ${companion.walking ? 'morgana-assistant--walking' : ''} ${companion.dragging ? 'morgana-assistant--dragging' : ''}`} style={!open ? { left: companion.position.x, top: companion.position.y, right: 'auto', bottom: 'auto' } : undefined}>
      {!open && companion.visible && <div className="morgana-companion" data-motion-paused={companion.userPaused} onPointerEnter={() => companion.setHovering(true)} onPointerLeave={() => companion.setHovering(false)} onFocusCapture={() => companion.setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) companion.setFocused(false); }}>
        {companion.tip && <div className="morgana-tip" style={{ left: companion.tipLeft, width: companion.tipWidth, ...(companion.tipBelow ? { bottom: 'auto', top: 'calc(100% + 7px)' } : {}) }} role="status"><div><span>Dica da Morgana</span><button type="button" aria-label="Dispensar dica" onClick={companion.dismissTip}><X size={12} /></button></div><p>{companion.tip}</p></div>}
        <button ref={launcher} type="button" className="morgana-launcher" onClick={() => { if (companion.allowClick()) setOpen(true); }} onPointerDown={companion.onPointerDown} onPointerMove={companion.onPointerMove} onPointerUp={companion.onPointerUp} onPointerCancel={companion.onPointerUp} onLostPointerCapture={companion.onPointerUp} onKeyDown={companion.onKeyDown} aria-label="Conversar com a Morgana, assistente de estudos" aria-describedby={movementHintId} aria-haspopup="dialog" aria-expanded={false} aria-controls={panelId}>
          <span className="morgana-facing" style={{ transform: `scaleX(${companion.direction < 0 ? 1 : -1})` }}><MorganaPet size={companion.size} state={companion.walking ? 'walking' : companion.tip ? 'speaking' : 'idle'} /></span>
        </button>
        <span id={movementHintId} className="sr-only">Arraste para reposicionar. Com foco na Morgana, use as setas para mover e Home para voltar ao canto. Enter abre a conversa.</span>
        <div className="morgana-companion-controls"><button type="button" aria-label={companion.userPaused ? 'Retomar movimento e dicas da Morgana' : 'Pausar movimento e dicas da Morgana'} title={companion.userPaused ? 'Retomar' : 'Pausar'} aria-pressed={companion.userPaused} onClick={companion.togglePaused}>{companion.userPaused ? <Play size={13} /> : <Pause size={13} />}</button><button type="button" aria-label="Ocultar Morgana. Use Chamar Morgana no topo para restaurar." title="Ocultar Morgana" onClick={() => { companion.hide(); document.querySelector<HTMLButtonElement>('[data-morgana-restore]')?.focus(); }}><EyeOff size={14} /></button></div>
      </div>}

      {open && <section id={panelId} className="morgana-panel" role="dialog" aria-modal="false" aria-labelledby={titleId} onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      }}>
        <header className="morgana-header">
          <MorganaPet size={48} state={busy ? 'thinking' : error ? 'error' : speaking ? 'speaking' : 'idle'} />
          <div className="morgana-header-title"><h2 id={titleId}>Morgana <span>AI</span></h2><p>Sua parceira de estudos</p></div>
          <button type="button" className="morgana-icon-button" aria-label="Limpar conversa" title="Limpar conversa" disabled={!messages.length && !pendingMessage} onClick={() => { assistant.clear(); setDraft(''); input.current?.focus(); }}><Trash2 size={16} /></button>
          <button ref={closeButton} type="button" className="morgana-icon-button" aria-label="Fechar Morgana" title="Fechar Morgana" onClick={close}><X size={19} /></button>
        </header>

        <div className="morgana-connection" role="status">
          {statusLoading ? <><LoaderCircle size={12} className="morgana-spinner" />Verificando disponibilidade</> : status?.configured ? <><span className="morgana-online-dot" />OpenAI · somente consulta</> : <><CircleAlert size={13} />{statusError ? 'Conexão indisponível' : 'IA aguardando configuração'}</>}
          <span>EduTrack</span>
        </div>

        <div ref={conversation} className="morgana-conversation" role="log" aria-label="Conversa com a Morgana" aria-live="polite" aria-relevant="additions text" aria-busy={busy}>
          {messages.length === 0 && !pendingMessage && <div className="morgana-welcome">
            <span className="morgana-eyebrow">UM PASSO DE CADA VEZ</span>
            <h3>Uma missão de estudo.<br />Um plano possível.</h3>
            <p>Eu te ajudo a encontrar o próximo passo entre tarefas, prazos e estudos. Por onde vamos começar?</p>
            <div className="morgana-prompts">{prompts.map(prompt => <button type="button" key={prompt.label} disabled={busy} onClick={() => { setDraft(prompt.text); input.current?.focus(); }}><prompt.icon size={16} aria-hidden="true" /><span>{prompt.label}</span><ChevronRight size={15} aria-hidden="true" /></button>)}</div>
            <p className="morgana-readonly"><Check size={13} aria-hidden="true" />Você decide. Suas tarefas e horários só mudam pelas ações do sistema.</p>
          </div>}
          {messages.map(message => <ConversationMessage key={message.id} message={message} onNavigate={close} />)}
          {pendingMessage && <article className="morgana-message morgana-message--user"><span className="morgana-message-author">Você</span><p>{pendingMessage}</p></article>}
          {busy && <div className="morgana-thinking" role="status"><span /><span /><span /><span className="sr-only">Morgana está preparando uma resposta.</span></div>}
          {error && <div className="morgana-error" role="alert"><CircleAlert size={17} aria-hidden="true" /><p>{error}</p><button type="button" onClick={async () => { const sent = pendingMessage; if (await assistant.send(sent)) setDraft(current => current.trim() === sent ? '' : current); }}><RefreshCw size={13} />Tentar novamente</button></div>}
          {!statusLoading && !status?.configured && <div className="morgana-unavailable">
            <strong>{statusError ? 'Não consegui verificar a conexão.' : 'A Morgana está pronta para receber IA.'}</strong>
            <p>{statusError ? 'Confira se o backend está em execução e tente novamente.' : 'Configure a chave da OpenAI no backend para ativar as respostas. Ela nunca é solicitada neste chat.'}</p>
            <button type="button" onClick={assistant.refreshStatus}><RefreshCw size={13} />Verificar novamente</button>
          </div>}
        </div>

        <form className="morgana-composer" onSubmit={event => { event.preventDefault(); void submit(); }}>
          <label className="morgana-context-toggle"><input type="checkbox" checked={assistant.includeContext} onChange={event => { assistant.changeContext(event.target.checked); setDraft(''); }} /><span>Usar meu contexto acadêmico</span><span title="Alterar esta opção inicia uma nova conversa para não reenviar o contexto anterior.">Nova conversa ao alterar</span></label>
          <label htmlFor={inputId} className="sr-only">Mensagem para a Morgana</label>
          <div className="morgana-input-wrap">
            <textarea ref={input} id={inputId} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Qual é sua missão de hoje?" rows={2} maxLength={ASSISTANT_MESSAGE_LIMIT} disabled={busy || !status?.configured || statusLoading} aria-describedby={privacyId} onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); }
            }} />
            {busy ? <button type="button" className="morgana-send" aria-label="Cancelar resposta" title="Cancelar resposta" onClick={assistant.cancel}><Square size={15} fill="currentColor" /></button> : <button type="submit" className="morgana-send" aria-label="Enviar mensagem" title="Enviar mensagem" disabled={!status?.configured || statusLoading || !draft.trim()}><ArrowUp size={19} /></button>}
          </div>
          <div className="morgana-composer-meta"><span>Enter envia · Shift + Enter quebra a linha</span><span>{draft.length}/{ASSISTANT_MESSAGE_LIMIT}</span></div>
          <p id={privacyId} className="morgana-privacy">Ao enviar, suas mensagens{assistant.includeContext ? ' e um resumo das tarefas, disciplinas, compromissos e estudos' : ''} são enviados à OpenAI. Conversa temporária, sem histórico salvo no EduTrack. A IA pode errar; confira as sugestões.</p>
        </form>
      </section>}
    </div>
  );
}
