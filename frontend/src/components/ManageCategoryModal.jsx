import React from 'react';

export default function ManageCategoryModal({ isOpen, onClose, column, onDelete }) {
  if (!isOpen || !column) return null;

  const handleDelete = () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the "${column.displayName}" category? This will remove the column for everyone.`
    );
    
    if (confirmDelete) {
      onDelete(column);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content manage-category-modal">
        <h2>Manage Category</h2>
        <p className="manage-category-name">
          <strong>{column.displayName}</strong> ({column.inputType})
        </p>
        
        {column.inputType === 'dropdown' && (
          <div className="manage-category-options">
            <p>Current Options: {column.options.join(', ') || 'None'}</p>
          </div>
        )}

        <div className="modal-actions manage-category-actions">
         <button 
  onClick={handleDelete}
  className="manage-category-delete-btn"
>
  <svg className="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
  Delete Category Completely
</button>
          
          <button 
            onClick={onClose}
            className="manage-category-cancel-btn"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}