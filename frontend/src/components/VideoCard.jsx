// src/components/VideoCard.jsx
import './VideoCard.css';

export default function VideoCard({ predication }) {
  const { date_publication, titre, pdf_url, video_youtube } = predication;

  // Extract YouTube video ID for thumbnail, fallback to placeholder image
  const ytMatch = video_youtube?.match(/v=([^&]+)/);
  const ytId = ytMatch ? ytMatch[1] : null;
  const thumb = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : '/assets/pdf-placeholder.png'; // ensure placeholder exists in public assets

  return (
    <article className="video-card">
      <div
        className="video-thumb"
        style={{ backgroundImage: `url(${thumb})` }}
        aria-label={titre}
      />
      <div className="video-info">
        <p className="date">{new Date(date_publication).toLocaleDateString()}</p>
        <h3>{titre}</h3>
        <div className="video-actions">
          {pdf_url && (
            <a href={pdf_url} target="_blank" rel="noopener noreferrer">
              📄 PDF
            </a>
          )}
          {video_youtube && (
            <a href={video_youtube} target="_blank" rel="noopener noreferrer">
              ▶️ YouTube
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
