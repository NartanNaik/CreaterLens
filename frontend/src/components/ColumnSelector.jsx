import { useEffect, useState } from "react";

const DEFAULT_COLUMNS = {
  username: true,
  nation: true,
  interestRate: true,
  createdAt: true,
  status: true,
  notes: true,
  addedBy: true,
  copy: true,
  delete: true
};

function ColumnSelector({
  open,
  columns,
  onClose,
  onSave
}) {
  const [selectedColumns, setSelectedColumns] = useState(DEFAULT_COLUMNS);

  useEffect(() => {
    setSelectedColumns({
      ...DEFAULT_COLUMNS,
      ...columns
    });
  }, [columns]);

  if (!open) {
    return null;
  }

  const toggleColumn = (key) => {
    setSelectedColumns((previous) => ({
      ...previous,
      [key]: !previous[key]
    }));
  };

  const handleSave = () => {
    onSave({
      username: selectedColumns.username,
      nation: selectedColumns.nation,
      interestRate: selectedColumns.interestRate,
      createdAt: selectedColumns.createdAt,
      status: selectedColumns.status,
      notes: selectedColumns.notes,
      addedBy: selectedColumns.addedBy,
      copy: selectedColumns.copy,
      delete: selectedColumns.delete
    });

    onClose();
  };

  const handleCancel = () => {
    setSelectedColumns({
      ...DEFAULT_COLUMNS,
      ...columns
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content column-modal">
        <h2>Visible Columns</h2>

        <div className="column-list">
          {Object.entries(selectedColumns).map(([key, value]) => (
            <label key={key} className="column-item">
              <input
                type="checkbox"
                checked={value}
                onChange={() => toggleColumn(key)}
                className="column-checkbox"
              />
              <span>
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (c) => c.toUpperCase())}
              </span>
            </label>
          ))}
        </div>

        <div className="modal-actions column-buttons">
          <button className="column-cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button className="column-save-btn" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default ColumnSelector;