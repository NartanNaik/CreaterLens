import "./DragFillOverlay.css";

function DragFillOverlay({
  visible,
  value,
  count
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="dragfill-overlay">
      <div className="dragfill-card">

        <div className="dragfill-icon">
          ⤓
        </div>

        <h3>
          Drag Fill
        </h3>

        <div className="dragfill-value">
          {value || "-"}
        </div>

        <p>
          Filling
          <strong>
            {" "}
            {count}
            {" "}
          </strong>
          row{count !== 1 ? "s" : ""}
        </p>

        <div className="dragfill-loader">
          <div className="dragfill-loader-bar"></div>
        </div>

      </div>
    </div>
  );
}

export default DragFillOverlay;