import { useEffect, useState } from "react";
import "./FilterModal.css";

function FilterModal({
  open,
  onClose,
  onApply,
  currentFilter
}) {
  const [filter, setFilter] = useState("name-asc");

  useEffect(() => {
    if (open) {
      setFilter(currentFilter || "name-asc");
    }
  }, [
    open,
    currentFilter
  ]);

  if (!open) {
    return null;
  }

  return (
    <div className="filter-overlay">
      <div className="filter-modal">

        <h2>
          Filter Usernames
        </h2>

        <div className="filter-options">

          <label>
            <input
              type="radio"
              value="name-asc"
              checked={filter === "name-asc"}
              onChange={(e) =>
                setFilter(e.target.value)
              }
            />
            Name (A → Z)
          </label>

          <label>
            <input
              type="radio"
              value="name-desc"
              checked={filter === "name-desc"}
              onChange={(e) =>
                setFilter(e.target.value)
              }
            />
            Name (Z → A)
          </label>

          <label>
            <input
              type="radio"
              value="nation-asc"
              checked={filter === "nation-asc"}
              onChange={(e) =>
                setFilter(e.target.value)
              }
            />
            Nation (A → Z)
          </label>

          <label>
            <input
              type="radio"
              value="nation-desc"
              checked={filter === "nation-desc"}
              onChange={(e) =>
                setFilter(e.target.value)
              }
            />
            Nation (Z → A)
          </label>

          <label>
            <input
              type="radio"
              value="interest-high"
              checked={filter === "interest-high"}
              onChange={(e) =>
                setFilter(e.target.value)
              }
            />
            Interest Rate (High → Low)
          </label>

          <label>
            <input
              type="radio"
              value="interest-low"
              checked={filter === "interest-low"}
              onChange={(e) =>
                setFilter(e.target.value)
              }
            />
            Interest Rate (Low → High)
          </label>

          <label>
            <input
              type="radio"
              value="today"
              checked={filter === "today"}
              onChange={(e) =>
                setFilter(e.target.value)
              }
            />
            Added Today
          </label>

          <label>
            <input
              type="radio"
              value="week"
              checked={filter === "week"}
              onChange={(e) =>
                setFilter(e.target.value)
              }
            />
            Added This Week
          </label>

          <label>
            <input
              type="radio"
              value="month"
              checked={filter === "month"}
              onChange={(e) =>
                setFilter(e.target.value)
              }
            />
            Added This Month
          </label>

        </div>

        <div className="filter-buttons">

          <button
            onClick={() =>
              onApply(filter)
            }
          >
            Apply
          </button>

          <button
            className="secondary-btn"
            onClick={onClose}
          >
            Cancel
          </button>

        </div>

      </div>
    </div>
  );
}

export default FilterModal;