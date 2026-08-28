import React, { useState } from 'react';

// --- Inline SVGs (No Emojis) ---
const XIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const TrashIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

export default function ManageCategoryModal({ isOpen, onClose, column, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  if (!isOpen || !column) return null;

  const handleDelete = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    
    onDelete(column);
    setConfirming(false);
    onClose();
  };

  const handleCancel = () => {
    setConfirming(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="manage-modal-container glass-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="manage-modal-header">
          <h2 className="manage-modal-title">
            <SettingsIcon /> Manage Category
          </h2>
          <button 
            onClick={handleCancel}
            className="manage-modal-close-btn"
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="manage-modal-body">
          <div className="manage-column-card">
            <p className="manage-column-text">
              <strong className="manage-column-name">{column.displayName}</strong> 
              <span className="manage-type-badge">
                {column.inputType}
              </span>
            </p>
          </div>

          {column.inputType === 'dropdown' && (
            <div className="manage-options-card">
              <p className="manage-options-label">Current Options</p>
              <p className="manage-options-text">
                {column.options && column.options.length > 0 ? column.options.join(', ') : 'None'}
              </p>
            </div>
          )}

          {confirming && (
            <div className="manage-confirm-box">
              Are you sure? This will remove the column <strong className="manage-highlight-name">"{column.displayName}"</strong> for everyone. Click delete again to confirm.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="manage-modal-footer">
          <button 
            onClick={handleDelete}
            className={`manage-delete-btn ${confirming ? 'confirming' : ''}`}
          >
            <TrashIcon /> {confirming ? "Confirm Delete" : "Delete Category"}
          </button>
          
          <button 
            onClick={handleCancel}
            className="manage-cancel-btn"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}