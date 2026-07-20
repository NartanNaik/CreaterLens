import { useEffect, useState } from "react";
import "./BulkAttributeModal.css";

function BulkAttributeModal({
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
        return "India\nJapan\nGermany";

      case "interestRate":
        return "25.4\n42.8\n71.2";

      case "status":
        return "Available\nReserved\nUsing";

      case "notes":
        return "High priority\nVerified account\nNeeds review";

      default:
        return `Paste ${attribute} values...`;
    }
  };

  return (
    <div className="bulk-overlay">
      <div className="bulk-modal">

        <h2>
          Bulk Upload {attribute}
        </h2>

        <p className="bulk-description">
          Paste one value per line.
          The first value will be assigned
          to the first username, the second
          value to the second username,
          and so on.
        </p>

        <textarea
          rows={14}
          value={values}
          onChange={(e) =>
            setValues(e.target.value)
          }
          placeholder={getPlaceholder()}
        />

        <div className="bulk-buttons">

          <button
            onClick={handleApply}
          >
            Apply
          </button>

          <button
            className="secondary-btn"
            onClick={() => {
              setValues("");
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

export default BulkAttributeModal;