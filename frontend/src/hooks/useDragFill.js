import { useState } from "react";

function useDragFill() {
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const startDrag = (value) => {
    setDragging(true);
    setDragValue(value);
    setSelectedIds([]);
  };

  const addRow = (id) => {
    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        return previous;
      }

      return [...previous, id];
    });
  };

  const finishDrag = () => {
    const result = {
      value: dragValue,
      ids: selectedIds
    };

    setDragging(false);
    setDragValue("");
    setSelectedIds([]);

    return result;
  };

  const cancelDrag = () => {
    setDragging(false);
    setDragValue("");
    setSelectedIds([]);
  };

  return {
    dragging,
    dragValue,
    selectedIds,
    startDrag,
    addRow,
    finishDrag,
    cancelDrag
  };
}

export default useDragFill;