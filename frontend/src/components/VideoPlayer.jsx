import { X } from 'lucide-react';
import './VideoPlayer.css';

export function VideoPlayer({ src, onClose }) {
  return (
    <div className="video-overlay glass-card">
      <button className="close-btn btn" onClick={onClose}>
        <X size={20} />
      </button>
      <video controls autoPlay src={src} className="video-element" />
    </div>
  );
}
