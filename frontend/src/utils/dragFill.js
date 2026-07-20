export const getDragFillIds = (
  rows,
  startIndex,
  endIndex
) => {
  const from = Math.min(
    startIndex,
    endIndex
  );

  const to = Math.max(
    startIndex,
    endIndex
  );

  return rows
    .slice(from, to + 1)
    .map((row) => row.id);
};

export const applyDragFill = (
  rows,
  ids,
  field,
  value
) => {
  return rows.map((row) => {
    if (!ids.includes(row.id)) {
      return row;
    }

    return {
      ...row,
      [field]: value
    };
  });
};

export const getDragCount = (
  startIndex,
  endIndex
) => {
  return (
    Math.abs(
      endIndex - startIndex
    ) + 1
  );
};

export const isDraggingDown = (
  startIndex,
  endIndex
) => {
  return endIndex >= startIndex;
};

export const createDragPayload = (
  rows,
  startIndex,
  endIndex,
  field,
  value
) => {
  return {
    ids: getDragFillIds(
      rows,
      startIndex,
      endIndex
    ),
    field,
    value
  };
};