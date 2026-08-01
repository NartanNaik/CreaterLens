import { useEffect, useState } from "react";

function CategoryModal({
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content cat-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create Category</h2>
        <form onSubmit={handleSubmit} className="cat-form">
          <input
            type="text"
            autoFocus
            placeholder="Enter Category Name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="cat-input"
          />
          <div className="modal-actions cat-buttons">
            <button type="button" className="cat-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="cat-create-btn" disabled={!value.trim()}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CategoryModal;