import React, { useEffect, useState } from "react";

// --- Inline SVGs (No Emojis) ---
const XIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ListIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const CheckIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// Helper to format camelCase strings to Title Case for UI display
const formatAttributeName = (str) => {
  if (!str) return "";
  const result = str.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

export default function BulkAttributeModal({
  open,
  attribute,
  onClose,
  onApply
}) {
  const [values, setValues] = useState("");

  useEffect(() => {
    if (open) {
      setValues("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleApply = () => {
    const list = values
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    onApply(list);
    setValues("");
    onClose();
  };

  const getPlaceholder = () => {
    switch (attribute) {
      case "nation":
        return "USA\nIndia\nGermany";
      case "skinTone":
        return "Fair\nTan\nDark";
      case "bodyType":
        return "Fit\nSlim\nCurvy";
      case "interestRate":
        return "25.4\n42.8\n71.2";
      case "status":
        return "Available\nReserved\nUsing";
      case "notes":
        return "High priority\nVerified account\nNeeds review";
      default:
        return `Paste ${formatAttributeName(attribute)} values...\nOne per line...`;
    }
  };

  return (
    <div className="modal-overlay bulk-attribute-overlay" onClick={onClose}>
      <div className="bulk-attribute-card glass-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bulk-attribute-header">
          <h2 className="bulk-attribute-title">
            <ListIcon /> Bulk Upload: {formatAttributeName(attribute)}
          </h2>
          <button 
            onClick={() => {
              setValues("");
              onClose();
            }}
            className="bulk-attribute-close-btn"
          >
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="bulk-attribute-body">
          <p className="bulk-attribute-desc">
            Paste one value per line. The first value will be assigned to the first username in your table, the second value to the second username, and so on.
          </p>

          <textarea
            rows={10}
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder={getPlaceholder()}
            className="bulk-attribute-textarea"
          />
        </div>

        {/* Footer Actions */}
        <div className="bulk-attribute-footer">
          <button
            onClick={() => {
              setValues("");
              onClose();
            }}
            className="bulk-attribute-cancel-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="bulk-attribute-apply-btn"
          >
            <CheckIcon /> Apply Values
          </button>
        </div>
        
      </div>
    </div>
  );
}