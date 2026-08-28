import React, { useEffect, useState } from "react";

// Updated to include all the new unified schema fields
const DEFAULT_COLUMNS = {
  username: true,
  nation: true,
  skinTone: true,
  bodyType: true,
  reelType: true,
  specialPart: true,
  ageRange: true,
  playable: true,
  totalFollowers: true,
  avgViewsPerWeek: true,
  interestRate: true,
  status: true,
  notes: true,
  createdAt: true,
  addedBy: true,
  copy: true,
  delete: true
};

// --- Inline SVGs (No Emojis) ---
const XIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const EyeIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const CheckIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export default function ColumnSelector({
  open,
  columns,
  onClose,
  onSave
}) {
  const [selectedColumns, setSelectedColumns] = useState(DEFAULT_COLUMNS);

  useEffect(() => {
    setSelectedColumns({
      ...DEFAULT_COLUMNS,
      ...columns
    });
  }, [columns, open]);

  if (!open) {
    return null;
  }

  const toggleColumn = (key) => {
    setSelectedColumns((previous) => ({
      ...previous,
      [key]: !previous[key]
    }));
  };

  const handleSave = () => {
    // CRITICAL FIX: We now pass the entire dynamic object back.
    // This ensures custom columns are preserved and saved correctly.
    onSave(selectedColumns);
    onClose();
  };

  const handleCancel = () => {
    setSelectedColumns({
      ...DEFAULT_COLUMNS,
      ...columns
    });
    onClose();
  };

  return (
    <div className="modal-overlay column-selector-overlay" onClick={handleCancel}>
      <div className="column-selector-card glass-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="column-selector-header">
          <h2 className="column-selector-title">
            <EyeIcon /> Visible Columns
          </h2>
          <button 
            onClick={handleCancel}
            className="column-selector-close-btn"
          >
            <XIcon />
          </button>
        </div>

        {/* Body - Scrollable to accommodate growing schemas */}
        <div className="column-selector-body">
          <div className="column-selector-grid">
            {Object.entries(selectedColumns).map(([key, value]) => (
              <label 
                key={key} 
                className={`column-selector-item ${value ? 'active' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => toggleColumn(key)}
                  className="column-selector-checkbox"
                />
                <span className={`column-selector-label-text ${value ? 'active' : ''}`}>
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (c) => c.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="column-selector-footer">
          <button
            onClick={handleCancel}
            className="column-selector-cancel-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="column-selector-save-btn"
          >
            <CheckIcon /> Save View
          </button>
        </div>

      </div>
    </div>
  );
}