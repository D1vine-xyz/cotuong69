import React from 'react';

/**
 * COT-584: Khối tính năng điều hướng (GameModeCard)
 * Đại diện cho các khối: Chơi Online, Chơi với Máy, Danh sách Bạn bè
 */
export default function GameModeCard({
  id,
  icon,
  title,
  tag,
  description,
  badge,
  active = false,
  onClick,
  accentColor = 'gold'
}) {
  return (
    <div
      id={id}
      className={`lobby-mode-card ${active ? 'is-active' : ''} mode-${accentColor}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`${title} - ${description}`}
    >
      <div className="card-top-row">
        <div className="mode-icon-box">{icon}</div>
        {tag && <span className="mode-tag-pill">{tag}</span>}
        {badge !== undefined && badge !== null && (
          <span className="mode-badge-count">{badge}</span>
        )}
      </div>
      <div className="card-info">
        <h3 className="mode-title">{title}</h3>
        <p className="mode-description">{description}</p>
      </div>
      <div className="card-footer-action">
        <span className="action-text">Truy cập</span>
        <span className="action-arrow">→</span>
      </div>
    </div>
  );
}
