import { useEffect, useState } from "react";
import "./CategoryModal.css";

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
    <div className="cat-overlay" onClick={onClose}>
      <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create Category</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            autoFocus
            placeholder="Enter Category Name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="cat-buttons">
            <button type="submit" disabled={!value.trim()}>
              Create
            </button>
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CategoryModal;
