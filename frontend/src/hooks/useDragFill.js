import { useState, useCallback } from 'react';

export default function useDragFill(onFillComplete) {
  const [isDragging, setIsDragging] = useState(false);
  const [startRowIndex, setStartRowIndex] = useState(null);
  const [activeColumn, setActiveColumn] = useState(null);
  const [dragValue, setDragValue] = useState(null);

  const handleMouseDown = (rowIndex, columnKey, value) => {
    setIsDragging(true);
    setStartRowIndex(rowIndex);
    setActiveColumn(columnKey);
    setDragValue(value);
  };

  const handleMouseEnter = (rowIndex, columnKey) => {
    // Only track if we are dragging within the same column
    if (isDragging && activeColumn === columnKey) {
      // You could add visual highlight states here in the future
    }
  };

  const handleMouseUp = useCallback((endRowIndex, columnKey) => {
    if (isDragging && activeColumn === columnKey && startRowIndex !== null) {
      const start = Math.min(startRowIndex, endRowIndex);
      const end = Math.max(startRowIndex, endRowIndex);
      
      if (start !== end) {
        // Execute the bulk update if more than one row was selected
        onFillComplete(start, end, columnKey, dragValue);
      }
    }
    
    // Reset state
    setIsDragging(false);
    setStartRowIndex(null);
    setActiveColumn(null);
    setDragValue(null);
  }, [isDragging, activeColumn, startRowIndex, dragValue, onFillComplete]);

  // Global mouse up to catch when the user releases outside a cell
  const handleGlobalMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setStartRowIndex(null);
      setActiveColumn(null);
      setDragValue(null);
    }
  }, [isDragging]);

  return {
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    handleGlobalMouseUp,
    isDragging
  };
}