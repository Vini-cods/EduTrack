import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { ResolvedTheme } from '../../lib/theme';
import { introPlaybackTimeout } from '../../lib/authEntry';
import lightVideo from '../../assets/intro/edutrack-entry-light.mp4';
import darkVideo from '../../assets/intro/edutrack-entry-dark.mp4';
import lightPoster from '../../assets/intro/edutrack-entry-light-poster.jpg';
import darkPoster from '../../assets/intro/edutrack-entry-dark-poster.jpg';
import './AuthSuccessIntro.css';

interface AuthSuccessIntroProps { entryId: number; onComplete: (entryId: number) => void }
type PlaybackState = 'loading' | 'playing';

/** Só existe durante uma entrada autenticada; o Dashboard ainda não está montado. */
export function AuthSuccessIntro({ entryId, onComplete }: AuthSuccessIntroProps) {
  const { resolvedTheme } = useTheme();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // O tema da entrada já está aplicado no primeiro render autenticado.
  const [videoTheme] = useState<ResolvedTheme>(resolvedTheme);
  const [playback, setPlayback] = useState<PlaybackState>('loading');
  const stageRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completed = useRef(false);
  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    videoRef.current?.pause();
    onComplete(entryId);
  }, [entryId, onComplete]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); finish(); }
    };
    stageRef.current?.focus();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finish]);

  useEffect(() => {
    if (reducedMotion) finish();
  }, [reducedMotion, finish]);

  useEffect(() => {
    const video = videoRef.current;
    if (reducedMotion || !video) return;
    let cancelled = false;
    video.muted = true;
    void video.play().catch(() => { if (!cancelled) finish(); });
    return () => { cancelled = true; video.pause(); };
  }, [videoTheme, reducedMotion, finish]);

  useEffect(() => {
    if (reducedMotion) return;
    const timeout = window.setTimeout(finish, playback === 'loading' ? 8000 : introPlaybackTimeout(videoRef.current?.duration ?? NaN));
    return () => window.clearTimeout(timeout);
  }, [videoTheme, reducedMotion, playback, finish]);

  // Um fluxo instável de waiting/playing não pode reiniciar o limite total.
  useEffect(() => {
    if (reducedMotion) return;
    const timeout = window.setTimeout(finish, 60_000);
    return () => window.clearTimeout(timeout);
  }, [videoTheme, reducedMotion, finish]);

  const dark = videoTheme === 'dark';
  const poster = dark ? darkPoster : lightPoster;

  return <main ref={stageRef} className="auth-success-intro" data-intro-theme={videoTheme} aria-label="Apresentação de entrada do EduTrack. Pressione Escape para entrar." tabIndex={-1}>
    {reducedMotion ? <img src={poster} className="auth-success-intro-video" alt="EduTrack, seu dashboard de estudos" /> : <video
      ref={videoRef} className="auth-success-intro-video" src={dark ? darkVideo : lightVideo}
      poster={poster} autoPlay muted playsInline preload="auto" disablePictureInPicture
      aria-label="Apresentação de entrada do EduTrack" tabIndex={-1}
      onPlaying={() => setPlayback('playing')} onWaiting={() => setPlayback('loading')}
      onEnded={finish} onError={finish}
    />}
  </main>;
}
