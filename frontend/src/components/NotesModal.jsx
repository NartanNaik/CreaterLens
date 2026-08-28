import { useEffect, useState } from "react";

// --- Inline SVGs (No Emojis) ---
const XIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const FileTextIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

function NotesModal({
  open,
  username,
  notes,
  onClose,
  onSave
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setValue(notes || "");
    }
  }, [open, notes]);

  if (!open) {
    return null;
  }

  const handleSave = () => {
    onSave(value.trim());
    onClose();
  };

  const handleCancel = () => {
    setValue(notes || "");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="notes-modal-container glass-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="notes-modal-header">
          <div className="notes-header-left">
            <span className="notes-header-icon"><FileTextIcon /></span>
            <div>
              <h2 className="notes-modal-title">Profile Notes</h2>
              {username && (
                <p className="notes-username-tag">@{username}</p>
              )}
            </div>
          </div>
          <button 
            onClick={handleCancel}
            className="notes-close-btn"
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="notes-modal-body">
          <textarea
            rows={8}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write notes or remarks here..."
            className="notes-textarea"
          />
        </div>

        {/* Footer Actions */}
        <div className="notes-modal-footer">
          <button
            className="notes-cancel-btn"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="notes-save-btn"
            onClick={handleSave}
          >
            <CheckIcon /> Save Notes
          </button>
        </div>

      </div>
    </div>
  );
}

export default NotesModal;