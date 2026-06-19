import './SkeletonLoader.css';

export function SermonCardSkeleton() {
  return (
    <div className="skeleton-sermon-card">
      <div className="skeleton skeleton-sermon-header"></div>
      <div className="skeleton skeleton-sermon-title"></div>
      <div className="skeleton skeleton-sermon-title" style={{ width: '60%' }}></div>
      <div className="skeleton-sermon-meta">
        <div className="skeleton skeleton-sermon-badge"></div>
        <div className="skeleton skeleton-sermon-badge"></div>
      </div>
    </div>
  );
}

export function PastorCardSkeleton() {
  return (
    <div className="skeleton-pastor-card">
      <div className="skeleton skeleton-pastor-avatar"></div>
      <div className="skeleton skeleton-pastor-name"></div>
      <div className="skeleton skeleton-pastor-church"></div>
    </div>
  );
}
