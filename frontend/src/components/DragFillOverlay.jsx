import React from "react";

// --- Inline SVGs (No Emojis) ---
const ArrowDownIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);

export default function DragFillOverlay({
  visible,
  value,
  count
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="modal-overlay drag-fill-overlay-backdrop">
      <div className="drag-fill-card glass-panel">
        
        {/* Cinematic Top Edge Accent */}
        <div className="drag-fill-accent-bar" />

        {/* Icon */}
        <div className="drag-fill-icon-box">
          <ArrowDownIcon />
        </div>

        {/* Title */}
        <h3 className="drag-fill-title">Drag Fill</h3>

        {/* Value Preview box */}
        <div className="drag-fill-preview-box">
          <span className="drag-fill-preview-text">
            {value || "-"}
          </span>
        </div>

        {/* Count Info */}
        <p className="drag-fill-count-info">
          Filling <strong className="drag-fill-highlight">{count}</strong> row{count !== 1 ? "s" : ""}
        </p>

        {/* Indeterminate Loader Animation */}
        <div className="drag-fill-loader-track">
          {/* Base pulse */}
          <div className="drag-fill-loader-base"></div>
          {/* Glowing animated bar */}
          <div className="drag-fill-loader-bar"></div>
        </div>

      </div>
    </div>
  );
}