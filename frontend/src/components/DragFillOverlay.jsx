function DragFillOverlay({
  visible,
  value,
  count
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="dragfill-overlay">
      <div className="glass-panel dragfill-card">
        <div className="dragfill-icon">
          <svg className="svg-icon drag-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </div>

        <h3>Drag Fill</h3>

        <div className="dragfill-value">
          {value || "-"}
        </div>

        <p>
          Filling <strong>{count}</strong> row{count !== 1 ? "s" : ""}
        </p>

        <div className="dragfill-loader">
          <div className="dragfill-loader-bar"></div>
        </div>
      </div>
    </div>
  );
}

export default DragFillOverlay;