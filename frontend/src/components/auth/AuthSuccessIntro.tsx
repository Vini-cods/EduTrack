import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Play, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { ResolvedTheme } from '../../lib/theme';
import { introPlaybackTimeout } from '../../lib/authEntry';
import { Button } from '../ui/Button';
import lightVideo from '../../assets/intro/edutrack-entry-light.mp4';
import darkVideo from '../../assets/intro/edutrack-entry-dark.mp4';
import lightPoster from '../../assets/intro/edutrack-entry-light-poster.jpg';
import darkPoster from '../../assets/intro/edutrack-entry-dark-poster.jpg';
import './AuthSuccessIntro.css';

interface AuthSuccessIntroProps { entryId: number; onComplete: (entryId: number) => void }
type PlaybackState = 'loading' | 'playing' | 'blocked';

/** Só existe durante uma entrada autenticada; o Dashboard ainda não está montado. */
export function AuthSuccessIntro({ entryId, onComplete }: AuthSuccessIntroProps) {
  const { resolvedTheme } = useTheme();
  const { ready: preferencesReady, error: preferencesError } = useUserPreferences();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [videoTheme, setVideoTheme] = useState<ResolvedTheme | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>('loading');
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completed = useRef(false);
  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    videoRef.current?.pause();
    onComplete(entryId);
  }, [entryId, onComplete]);

  // Evita trocar o arquivo no meio da reprodução quando o tema remoto chega.
  // Uma falha nas preferências usa cache/sistema e não impede a entrada.
  useEffect(() => {
    if (preferencesReady || preferencesError) setVideoTheme(current => current ?? resolvedTheme);
  }, [preferencesReady, preferencesError, resolvedTheme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); finish(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finish]);

  useEffect(() => {
    const video = videoRef.current;
    if (!videoTheme || reducedMotion || !video) return;
    let cancelled = false;
    video.muted = true;
    void video.play().catch(() => { if (!cancelled) setPlayback('blocked'); });
    return () => { cancelled = true; video.pause(); };
  }, [videoTheme, reducedMotion]);

  useEffect(() => {
    if (!videoTheme || reducedMotion || playback === 'blocked') return;
    const timeout = window.setTimeout(finish, playback === 'loading' ? 8000 : introPlaybackTimeout(videoRef.current?.duration ?? NaN));
    return () => window.clearTimeout(timeout);
  }, [videoTheme, reducedMotion, playback, finish]);

  // Um fluxo instável de waiting/playing não pode reiniciar o limite total.
  useEffect(() => {
    if (!videoTheme || reducedMotion) return;
    const timeout = window.setTimeout(finish, 60_000);
    return () => window.clearTimeout(timeout);
  }, [videoTheme, reducedMotion, finish]);

  const playManually = () => {
    const video = videoRef.current;
    if (!video) return;
    setPlayback('loading');
    void video.play().catch(() => setPlayback('blocked'));
  };
  const activeTheme = videoTheme ?? resolvedTheme;
  const dark = activeTheme === 'dark';
  const still = reducedMotion || videoTheme === null;
  const poster = dark ? darkPoster : lightPoster;

  return <main className="auth-success-intro" data-intro-theme={activeTheme} aria-labelledby="entry-intro-title">
    <h1 id="entry-intro-title" className="sr-only">Bem-vindo ao EduTrack</h1>
    <div className="auth-success-intro-media">
      {still ? <img src={poster} className="auth-success-intro-video" alt="EduTrack, seu dashboard de estudos" /> : <video
        ref={videoRef} className="auth-success-intro-video" src={dark ? darkVideo : lightVideo}
        poster={poster} autoPlay muted={muted} playsInline preload="auto" disablePictureInPicture
        aria-label="Apresentação de entrada do EduTrack" tabIndex={-1}
        onPlaying={() => setPlayback('playing')} onWaiting={() => setPlayback('loading')}
        onEnded={finish} onError={finish}
      />}
    </div>
    <footer className="auth-success-intro-controls">
      <p role="status" className="text-sm text-graphite">{reducedMotion ? 'Seu espaço de estudos está pronto.' : videoTheme === null ? 'Preparando seu espaço…' : playback === 'blocked' ? 'Reproduza a apresentação ou entre no seu espaço.' : playback === 'loading' ? 'Carregando apresentação…' : 'Seu próximo passo começa aqui.'}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!still && playback === 'blocked' && <Button variant="outline" className="min-h-11" onClick={playManually} icon={<Play size={16} aria-hidden="true" />}>Reproduzir</Button>}
        {!still && <Button variant="ghost" className="min-h-11" onClick={() => setMuted(value => !value)} aria-pressed={!muted}
          aria-label={muted ? 'Ativar som da apresentação' : 'Silenciar apresentação'} icon={muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}>
          {muted ? 'Ativar som' : 'Silenciar'}
        </Button>}
        <Button autoFocus variant="outline" className="min-h-11" onClick={finish} icon={<ArrowRight size={16} aria-hidden="true" />}>{reducedMotion ? 'Continuar' : 'Pular apresentação'}</Button>
      </div>
    </footer>
  </main>;
}
