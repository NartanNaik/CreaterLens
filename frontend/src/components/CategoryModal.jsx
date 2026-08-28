import React, { useEffect, useState } from "react";

// --- Inline SVGs (No Emojis) ---
const XIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const FolderPlusIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    <line x1="12" y1="11" x2="12" y2="17"></line>
    <line x1="9" y1="14" x2="15" y2="14"></line>
  </svg>
);

const PlusIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export default function CategoryModal({
  open,
  onClose,
  onSave
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setValue("");
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const handleEsc = (e) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSave(value.trim());
    }
  };

  return (
    <div className="modal-overlay category-modal-overlay" onClick={onClose}>
      <div className="category-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="category-modal-header">
          <h2 className="category-modal-title">
            <FolderPlusIcon /> Create Category
          </h2>
          <button 
            onClick={onClose}
            className="category-modal-close-btn"
          >
            <XIcon />
          </button>
        </div>

        {/* Body / Form */}
        <form onSubmit={handleSubmit} className="category-modal-form">
          <div className="category-modal-body">
            <input
              type="text"
              autoFocus
              placeholder="e.g., Target Demographic"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="category-modal-input"
            />
          </div>

          {/* Footer Actions */}
          <div className="category-modal-footer">
            <button
              type="button"
              className="category-modal-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="category-modal-submit-btn"
            >
              <PlusIcon /> Create
            </button>
          </div>
        </form>
        
      </div>
    </div>
  );
}