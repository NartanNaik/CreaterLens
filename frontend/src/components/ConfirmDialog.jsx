import React, { useEffect } from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (open) {
      const handleEsc = (e) => {
        if (e.key === "Escape") onCancel();
      };
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog-card glass-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Danger Icon */}
        <div className="confirm-dialog-icon-box">
          <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        {/* Text Content */}
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>
        
        {/* Actions */}
        <div className="confirm-dialog-actions">
          <button 
            className="confirm-dialog-cancel-btn" 
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="confirm-dialog-confirm-btn" 
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>

      </div>
    </div>
  );
}