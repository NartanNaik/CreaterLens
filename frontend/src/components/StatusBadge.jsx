import React from 'react';

const statusOptions = [
  "Available",
  "Reserved",
  "Using",
  "Sold",
  "Rejected"
];

// Mapped to specific CSS modifier classes for dark mode styling
const statusClasses = {
  Available: "status-badge-available",
  Reserved: "status-badge-reserved",
  Using: "status-badge-using",
  Sold: "status-badge-sold",
  Rejected: "status-badge-rejected"
};

function StatusBadge({
  status = "Available",
  editable = false,
  onChange
}) {
  const currentStatus = statusOptions.includes(status) ? status : "Available";
  const badgeClass = statusClasses[currentStatus] || statusClasses.Available;

  if (editable) {
    return (
      <select
        value={currentStatus}
        onChange={(e) => onChange(e.target.value)}
        className={`status-select-dropdown ${badgeClass}`}
      >
        {statusOptions.map((item) => (
          <option key={item} value={item} className="status-select-option">
            {item}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span className={`status-badge-pill ${badgeClass}`}>
      {currentStatus}
    </span>
  );
}

export default StatusBadge;