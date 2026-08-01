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
      <div className="glass-panel modal-content" style={{ width: '350px', textAlign: 'center' }}>
        <h2>Manage Category</h2>
        <p style={{ margin: '15px 0', color: 'var(--text-main)' }}>
          <strong>{column.displayName}</strong> ({column.inputType})
        </p>
        
        {column.inputType === 'dropdown' && (
          <div style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>
            <p>Current Options: {column.options.join(', ') || 'None'}</p>
          </div>
        )}

        <div className="modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button 
            onClick={handleDelete}
            style={{ padding: '10px 16px', background: 'var(--status-no)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🗑️ Delete Category Completely
          </button>
          
          <button 
            onClick={onClose}
            style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', borderRadius: '5px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}