import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import './AudioPlayer.css';

export function AudioPlayer() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState('');
  const [title, setTitle] = useState('Aucun sermon');

  // Listen for a custom event that provides the audio URL and title
  useEffect(() => {
    const handler = (e) => {
      const { url, title: newTitle } = e.detail;
      setSrc(url);
      setTitle(newTitle);
      setPlaying(true);
    };
    window.addEventListener('play-sermon', handler);
    return () => window.removeEventListener('play-sermon', handler);
  }, []);

  // Sync play/pause state with actual audio element
  useEffect(() => {
    if (audioRef.current) {
      playing ? audioRef.current.play() : audioRef.current.pause();
    }
  }, [playing, src]);

  if (!src) {
    return null;
  }

  return (
    <div className="audio-player glass-card">
      <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} />
      <div className="info"><strong>{title}</strong></div>
      <div className="controls">
        <button className="btn" onClick={() => setPlaying(!playing)} type="button">
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="btn" type="button"><SkipBack size={20} /></button>
        <button className="btn" type="button"><SkipForward size={20} /></button>
        <button className="btn" type="button"><Volume2 size={20} /></button>
      </div>
    </div>
  );
}
