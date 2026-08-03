import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, X, RotateCcw, RotateCw, Music } from 'lucide-react';
import './AudioPlayer.css';

export function AudioPlayer() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState('');
  const [title, setTitle] = useState('');
  const [cover, setCover] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Écoute de l'événement personnalisé pour lancer un sermon
  useEffect(() => {
    const handler = (e) => {
      const { url, title: newTitle, cover: newCover } = e.detail;
      setSrc(url);
      setTitle(newTitle || 'Sermon Audio');
      setCover(newCover || null);
      setPlaying(true);
      setIsClosing(false);
    };
    window.addEventListener('play-sermon', handler);
    return () => window.removeEventListener('play-sermon', handler);
  }, []);

  // Synchronisation de la lecture avec l'état `playing`
  useEffect(() => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [playing, src]);

  // Synchronisation du volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
  };

  const skipForward = () => {
    if (audioRef.current) audioRef.current.currentTime += 15;
  };

  const skipBackward = () => {
    if (audioRef.current) audioRef.current.currentTime -= 15;
  };

  const handleClose = () => {
    setIsClosing(true);
    setPlaying(false);
    setTimeout(() => {
      setSrc('');
      setIsClosing(false);
    }, 400); // durée de l'animation de sortie
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!src && !isClosing) {
    return null;
  }

  return (
    <div className={`audio-player-premium ${isClosing ? 'closing' : 'visible'}`}>
      <audio 
        ref={audioRef} 
        src={src} 
        onEnded={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      
      <div className="ap-cover-container">
        {cover ? (
          <img src={cover} alt="Cover" className="ap-cover" />
        ) : (
          <div className="ap-cover-fallback">
            <Music size={24} />
          </div>
        )}
      </div>

      <div className="ap-main-content">
        <div className="ap-header">
          <div className="ap-title-scroll">
            <strong>{title}</strong>
          </div>
          <button className="ap-close-btn" onClick={handleClose} aria-label="Fermer le lecteur">
            <X size={18} />
          </button>
        </div>

        <div className="ap-controls-row">
          <div className="ap-playback-controls">
            <button className="ap-icon-btn" onClick={skipBackward} aria-label="-15 secondes">
              <RotateCcw size={18} />
            </button>
            <button className="ap-play-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Lecture"}>
              {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>
            <button className="ap-icon-btn" onClick={skipForward} aria-label="+15 secondes">
              <RotateCw size={18} />
            </button>
          </div>

          <div className="ap-progress-container">
            <span className="ap-time">{formatTime(currentTime)}</span>
            <input 
              type="range" 
              className="ap-progress-bar" 
              min={0} 
              max={duration || 100} 
              value={currentTime} 
              onChange={handleSeek} 
              aria-label="Barre de progression"
              style={{
                '--progress-val': `${(currentTime / (duration || 100)) * 100}%`
              }}
            />
            <span className="ap-time">{formatTime(duration)}</span>
          </div>

          <div className="ap-volume-control">
            <button className="ap-icon-btn" onClick={() => setIsMuted(!isMuted)} aria-label={isMuted ? "Activer le son" : "Couper le son"}>
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
