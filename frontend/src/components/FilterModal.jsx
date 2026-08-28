import { useEffect, useState } from "react";

// --- Inline SVGs (No Emojis) ---
const XIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const FilterIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const CheckIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="filter-modal-container glass-panel" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="filter-modal-header">
          <h2 className="filter-modal-title">
            <FilterIcon /> Filter Usernames
          </h2>
          <button 
            onClick={onClose}
            className="filter-modal-close-btn"
          >
            <XIcon />
          </button>
        </div>

        {/* Options List */}
        <div className="filter-options-list">
          <label className={`filter-option-label ${filter === "name-asc" ? "active" : ""}`}>
            <input
              type="radio"
              value="name-asc"
              checked={filter === "name-asc"}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-radio-input"
            />
            <span className="filter-option-text">Name (A → Z)</span>
          </label>

          <label className={`filter-option-label ${filter === "name-desc" ? "active" : ""}`}>
            <input
              type="radio"
              value="name-desc"
              checked={filter === "name-desc"}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-radio-input"
            />
            <span className="filter-option-text">Name (Z → A)</span>
          </label>

          <label className={`filter-option-label ${filter === "nation-asc" ? "active" : ""}`}>
            <input
              type="radio"
              value="nation-asc"
              checked={filter === "nation-asc"}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-radio-input"
            />
            <span className="filter-option-text">Nation (A → Z)</span>
          </label>

          <label className={`filter-option-label ${filter === "nation-desc" ? "active" : ""}`}>
            <input
              type="radio"
              value="nation-desc"
              checked={filter === "nation-desc"}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-radio-input"
            />
            <span className="filter-option-text">Nation (Z → A)</span>
          </label>

          <label className={`filter-option-label ${filter === "interest-high" ? "active" : ""}`}>
            <input
              type="radio"
              value="interest-high"
              checked={filter === "interest-high"}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-radio-input"
            />
            <span className="filter-option-text">Interest Rate (High → Low)</span>
          </label>

          <label className={`filter-option-label ${filter === "interest-low" ? "active" : ""}`}>
            <input
              type="radio"
              value="interest-low"
              checked={filter === "interest-low"}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-radio-input"
            />
            <span className="filter-option-text">Interest Rate (Low → High)</span>
          </label>

          <label className={`filter-option-label ${filter === "today" ? "active" : ""}`}>
            <input
              type="radio"
              value="today"
              checked={filter === "today"}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-radio-input"
            />
            <span className="filter-option-text">Added Today</span>
          </label>

          <label className={`filter-option-label ${filter === "week" ? "active" : ""}`}>
            <input
              type="radio"
              value="week"
              checked={filter === "week"}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-radio-input"
            />
            <span className="filter-option-text">Added This Week</span>
          </label>

          <label className={`filter-option-label ${filter === "month" ? "active" : ""}`}>
            <input
              type="radio"
              value="month"
              checked={filter === "month"}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-radio-input"
            />
            <span className="filter-option-text">Added This Month</span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="filter-modal-footer">
          <button
            className="filter-cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="filter-apply-btn"
            onClick={() => onApply(filter)}
          >
            <CheckIcon /> Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterModal;