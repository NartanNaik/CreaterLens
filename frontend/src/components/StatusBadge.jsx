import "./StatusBadge.css";

const statusOptions = [
  "Available",
  "Reserved",
  "Using",
  "Sold",
  "Rejected"
];

const statusColors = {
  Available: "available",
  Reserved: "reserved",
  Using: "using",
  Sold: "sold",
  Rejected: "rejected"
};

function StatusBadge({
  status = "Available",
  editable = false,
  onChange
}) {
  const currentStatus =
    statusOptions.includes(status)
      ? status
      : "Available";

  if (editable) {
    return (
      <select
        className={`status-select ${statusColors[currentStatus]}`}
        value={currentStatus}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      >
        {statusOptions.map((item) => (
          <option
            key={item}
            value={item}
          >
            {item}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      className={`status-badge ${statusColors[currentStatus]}`}
    >
      {currentStatus}
    </span>
  );
}

export default StatusBadge;