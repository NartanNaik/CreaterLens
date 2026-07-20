import { useEffect, useState } from "react";
import "./NotesModal.css";

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
  }, [
    open,
    notes
  ]);

  if (!open) {
    return null;
  }

  const handleSave = () => {
    onSave(
      value.trim()
    );
  };

  return (
    <div className="notes-overlay">
      <div className="notes-modal">

        <h2>
          Notes
        </h2>

        <p className="notes-username">
          {username}
        </p>

        <textarea
          rows={10}
          value={value}
          onChange={(e) =>
            setValue(
              e.target.value
            )
          }
          placeholder="Write notes..."
        />

        <div className="notes-buttons">

          <button
            onClick={handleSave}
          >
            Save
          </button>

          <button
            className="secondary-btn"
            onClick={() => {
              setValue(notes || "");
              onClose();
            }}
          >
            Cancel
          </button>

        </div>

      </div>
    </div>
  );
}

export default NotesModal;