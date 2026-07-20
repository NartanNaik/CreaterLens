import { useEffect, useState } from "react";
import "./ColumnSelector.css";

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
  const [selectedColumns, setSelectedColumns] =
    useState(DEFAULT_COLUMNS);

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
    <div className="column-overlay">
      <div className="column-modal">

        <h2>
          Visible Columns
        </h2>

        <div className="column-list">

          {Object.entries(selectedColumns).map(
            ([key, value]) => (
              <label
                key={key}
                className="column-item"
              >
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() =>
                    toggleColumn(key)
                  }
                />

                <span>
                  {key
                    .replace(
                      /([A-Z])/g,
                      " $1"
                    )
                    .replace(
                      /^./,
                      (c) =>
                        c.toUpperCase()
                    )}
                </span>
              </label>
            )
          )}

        </div>

        <div className="column-buttons">

          <button
            onClick={handleSave}
          >
            Save
          </button>

          <button
            className="secondary-btn"
            onClick={handleCancel}
          >
            Cancel
          </button>

        </div>

      </div>
    </div>
  );
}

export default ColumnSelector;