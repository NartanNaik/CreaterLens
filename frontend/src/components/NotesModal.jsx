import { useEffect, useState } from "react";

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
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content notes-modal">
        <h2>Notes</h2>
        
        <p className="notes-username">
          {username}
        </p>

        <textarea
          rows={10}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write notes..."
          className="notes-textarea"
        />

        <div className="modal-actions notes-buttons">
          <button
            className="notes-cancel-btn"
            onClick={() => {
              setValue(notes || "");
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            className="notes-save-btn"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotesModal;