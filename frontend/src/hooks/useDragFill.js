import { useState, useCallback } from 'react';

export default function useDragFill(onFillComplete) {
  const [isDragging, setIsDragging] = useState(false);
  const [startRowIndex, setStartRowIndex] = useState(null);
  const [currentRowIndex, setCurrentRowIndex] = useState(null); // Added to track live drag count
  const [activeColumn, setActiveColumn] = useState(null);
  const [dragValue, setDragValue] = useState(null);

  const handleMouseDown = (rowIndex, columnKey, value) => {
    setIsDragging(true);
    setStartRowIndex(rowIndex);
    setCurrentRowIndex(rowIndex);
    setActiveColumn(columnKey);
    setDragValue(value);
  };

  const handleMouseEnter = (rowIndex, columnKey) => {
    // Only track if we are dragging within the same column
    if (isDragging && activeColumn === columnKey) {
      setCurrentRowIndex(rowIndex);
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
    setCurrentRowIndex(null);
    setActiveColumn(null);
    setDragValue(null);
  }, [isDragging, activeColumn, startRowIndex, dragValue, onFillComplete]);

  // Global mouse up to catch when the user releases outside a cell
  const handleGlobalMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setStartRowIndex(null);
      setCurrentRowIndex(null);
      setActiveColumn(null);
      setDragValue(null);
    }
  }, [isDragging]);

  // Calculate dynamic feedback for the DragFillOverlay UI
  const count = startRowIndex !== null && currentRowIndex !== null 
    ? Math.abs(currentRowIndex - startRowIndex) + 1 
    : 0;
  
  const isVisible = isDragging && count > 1;

  return {
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    handleGlobalMouseUp,
    isDragging,
    isVisible, // Controls visibility of the overlay
    value: dragValue, // Passes the data being copied to the overlay
    count // Shows the user how many rows they are about to overwrite
  };
}