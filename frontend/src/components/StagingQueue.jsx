import React, { useState, useEffect } from 'react';
import api from '../services/api';

// --- Inline SVGs (No Emojis) ---
const LayersIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);

const CheckIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const TrashIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const RefreshIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

export default function StagingQueue() {
  const [stagedItems, setStagedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    fetchStagingQueue();
  }, []);

  const fetchStagingQueue = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/staging');
      setStagedItems(Array.isArray(data) ? data : data.items || []);
    } catch (error) {
      console.error("Failed to fetch staging queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/staging/${id}/approve`);
      setStagedItems(prev => prev.filter(item => item.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error("Failed to approve staged item:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/staging/${id}`);
      setStagedItems(prev => prev.filter(item => item.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error("Failed to delete staged item:", error);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === stagedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(stagedItems.map(item => item.id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.post('/staging/bulk-approve', { ids: Array.from(selectedIds) });
      setStagedItems(prev => prev.filter(item => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk approval failed:", error);
    }
  };

  return (
    <div className="staging-page-container">
      
      {/* Header Container */}
      <div className="staging-header-panel glass-panel">
        <div className="staging-header-left">
          <div className="staging-icon-wrap">
            <LayersIcon />
          </div>
          <div>
            <h1 className="staging-title">Staging Queue</h1>
            <p className="staging-subtitle">Review and approve ingested profiles before pushing to live production.</p>
          </div>
        </div>

        <div className="staging-header-actions">
          <button 
            onClick={fetchStagingQueue}
            disabled={loading}
            className="staging-refresh-btn"
          >
            <RefreshIcon /> {loading ? 'Refreshing...' : 'Refresh Queue'}
          </button>

          {selectedIds.size > 0 && (
            <button 
              onClick={handleBulkApprove}
              className="staging-bulk-approve-btn"
            >
              <CheckIcon /> Approve Selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Queue Table */}
      <div className="table-wrapper glass-panel">
        <table className="profile-table staging-table">
          <thead>
            <tr>
              <th className="staging-col-checkbox">
                <input 
                  type="checkbox"
                  checked={stagedItems.length > 0 && selectedIds.size === stagedItems.length}
                  onChange={handleToggleSelectAll}
                  className="staging-checkbox"
                />
              </th>
              <th>Username</th>
              <th>Nation</th>
              <th>Followers</th>
              <th>Source / Context</th>
              <th className="staging-col-actions">Actions</th>
            </tr>
          </thead>
          
          <tbody>
            {stagedItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="staging-empty-row">
                  {loading ? "Loading staging queue..." : "No profiles currently waiting in the staging queue."}
                </td>
              </tr>
            ) : (
              stagedItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr key={item.id} className={isSelected ? 'staging-row-selected' : ''}>
                    <td>
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="staging-checkbox"
                      />
                    </td>
                    <td className="staging-username-cell">{item.username}</td>
                    <td>{item.nation || '-'}</td>
                    <td className="staging-mono-cell">{item.totalFollowers ? Number(item.totalFollowers).toLocaleString() : '0'}</td>
                    <td className="staging-source-cell">{item.source || 'Manual Ingest'}</td>
                    <td>
                      <div className="staging-row-actions-group">
                        <button 
                          className="action-btn staging-approve-btn"
                          onClick={() => handleApprove(item.id)}
                        >
                          <CheckIcon /> Approve
                        </button>
                        <button 
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(item.id)}
                        >
                          <TrashIcon /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}