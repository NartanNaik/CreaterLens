import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import GarbageEater from './GarbageEater';

const LayersIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

const SparkleIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
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
  const navigate = useNavigate();
  const [stagedItems, setStagedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  const [processingIds, setProcessingIds] = useState(new Set()); 
  const isAutoProcessingRef = useRef(false);

  // FETCH QUEUE EXACTLY ONCE ON PAGE LOAD. NO BACKGROUND POLLING.
  useEffect(() => {
    fetchStagingQueue(true);
  }, []);

  // STRICT SINGLE-FILE SEQUENTIAL QUEUE
  useEffect(() => {
    const processNextPendingItem = async () => {
      const pendingItem = stagedItems.find(item => 
        (item.status === 'pending' || item.status === 'scraping_done') && !processingIds.has(item.id)
      );
      
      if (pendingItem && !isAutoProcessingRef.current) {
        isAutoProcessingRef.current = true; 
        
        await handleProcessAISequence(pendingItem.id, pendingItem.status);
        
        // Safe 6-second cooldown window between individual reels to respect Gemini API limits
        setTimeout(() => {
          isAutoProcessingRef.current = false;
        }, 6000);
      }
    };

    processNextPendingItem();
  }, [stagedItems, processingIds]);

  const fetchStagingQueue = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const { data } = await api.get('/staging');
      setStagedItems(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch staging queue:", error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const setRowProcessing = (id, isProcessing) => {
    setProcessingIds(prev => {
      const next = new Set(prev);
      if (isProcessing) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleEditUsername = (id, currentName) => {
    const newName = window.prompt("Enter the exact Instagram username (without @):", currentName === 'Unknown' ? '' : currentName);
    
    if (newName && newName.trim() !== "" && newName !== currentName) {
      const cleanedName = newName.trim();
      setStagedItems(prev => prev.map(item => item.id === id ? { ...item, username: cleanedName } : item));
      handleProcessAISequence(id, 'pending', cleanedName);
    }
  };

  const handleProcessAISequence = async (id, currentStatus = 'pending', customUsername = null) => {
    if (processingIds.has(id)) return;
    setRowProcessing(id, true);
    
    try {
      const payload = customUsername ? { username: customUsername } : {};

      if (currentStatus === 'pending' || currentStatus === 'failed') {
        await api.post(`/staging/${id}/process?step=scrape`, payload);
        setStagedItems(prev => prev.map(item => item.id === id ? { ...item, status: 'scraping_done' } : item));
      }

      const { data } = await api.post(`/staging/${id}/process?step=analyze`, payload);
      
      if (data.deleted) {
        setStagedItems(prev => prev.filter(item => item.id !== id));
      } else {
        setStagedItems(prev => prev.map(item => item.id === id ? { ...item, ...data.data } : item));
      }
    } catch (error) {
      console.warn("Processing encountered an issue for item:", id, error);
      
      if (error.response && error.response.status === 429) {
        setStagedItems(prev => prev.map(item => item.id === id ? { ...item, status: 'pending' } : item));
      } else {
        setStagedItems(prev => prev.map(item => item.id === id ? { ...item, status: 'failed' } : item));
      }
    } finally {
      setRowProcessing(id, false);
    }
  };

  const handleApprove = async (id) => {
    if (processingIds.has(id)) return;
    setRowProcessing(id, true);
    
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
      alert("Approval failed. Please try again.");
    } finally {
      setRowProcessing(id, false);
    }
  };

  const handleDelete = async (id) => {
    if (processingIds.has(id)) return;
    setRowProcessing(id, true);

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
    } finally {
      setRowProcessing(id, false);
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
    setLoading(true);
    try {
      await api.post('/staging/bulk-approve', { ids: Array.from(selectedIds) });
      setStagedItems(prev => prev.filter(item => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk approval failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAll = async () => {
    if (stagedItems.length === 0) return;
    if (!window.confirm("Are you sure you want to approve ALL profiles in this queue?")) return;
    
    setLoading(true);
    try {
      const allIds = stagedItems.map(item => item.id);
      await api.post('/staging/bulk-approve', { ids: allIds });
      setStagedItems([]);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Approve All failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (stagedItems.length === 0) return;
    if (!window.confirm("Are you sure you want to PERMANENTLY DELETE ALL items in this queue?")) return;
    
    setLoading(true);
    try {
      const allIds = stagedItems.map(item => item.id);
      await api.post('/staging/bulk-delete', { ids: allIds });
      setStagedItems([]);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Delete All failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderAttr = (attr) => {
    if (!attr) return '-';
    if (typeof attr === 'object' && attr !== null) return attr.value || '-';
    return attr;
  };

  return (
    <div className="staging-page-container">
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
            onClick={() => navigate('/dashboard')}
            className="staging-refresh-btn"
            style={{ backgroundColor: 'var(--surface-sunken)', color: 'var(--text-main)', border: '1px solid var(--border-light)' }}
          >
            <ArrowLeftIcon /> Back to Dashboard
          </button>
          
          <button 
            onClick={() => fetchStagingQueue(true)}
            disabled={loading}
            className="staging-refresh-btn"
          >
            <RefreshIcon /> {loading ? 'Refreshing...' : 'Refresh Queue'}
          </button>

          <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '12px', marginLeft: '4px', display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleApproveAll}
              disabled={loading || stagedItems.length === 0}
              className="staging-bulk-approve-btn"
            >
              <CheckIcon /> Approve All
            </button>
            <button 
              onClick={handleDeleteAll}
              disabled={loading || stagedItems.length === 0}
              className="action-btn delete-btn"
              style={{ backgroundColor: 'var(--surface-raised)' }}
            >
              <TrashIcon /> Delete All
            </button>
          </div>
        </div>
      </div>

      {/* NEW: Insert the Garbage Eater tool directly into the dashboard flow */}
      <GarbageEater />

      {selectedIds.size > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: 'var(--surface-raised)', borderRadius: '8px', border: '1px solid var(--border-accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{selectedIds.size} items selected</span>
          <button onClick={handleBulkApprove} className="staging-bulk-approve-btn">
            <CheckIcon /> Approve Selected
          </button>
        </div>
      )}

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
              <th>Link</th>
              <th>Nation</th>
              <th>Skin Tone</th>
              <th>Body Type</th>
              <th>Reel Type</th>
              <th>Special Part</th>
              <th>Age</th>
              <th>Followers</th>
              <th>Avg Views</th>
              <th>Avg Likes</th>
              <th>Avg Comments</th>
              <th className="staging-col-actions" style={{ minWidth: '320px' }}>Actions</th>
            </tr>
          </thead>
          
          <tbody>
            {stagedItems.length === 0 ? (
              <tr>
                <td colSpan="14" className="staging-empty-row">
                  {loading ? "Loading staging queue..." : "No profiles currently waiting in the staging queue."}
                </td>
              </tr>
            ) : (
              stagedItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isProcessingRow = processingIds.has(item.id);
                const isPendingAI = item.status === 'pending' || item.status === 'scraping_done';
                const isFailed = item.status === 'failed';
                
                return (
                  <tr key={item.id} className={isSelected ? 'staging-row-selected' : ''} style={{ opacity: isProcessingRow ? 0.6 : 1, pointerEvents: isProcessingRow ? 'none' : 'auto' }}>
                    <td>
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="staging-checkbox"
                      />
                    </td>
                    
                    <td className="staging-username-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: item.username === 'Unknown' ? 'bold' : 'normal', color: item.username === 'Unknown' ? 'var(--accent-red)' : 'inherit' }}>
                          {item.username || 'Unknown'}
                        </span>
                        <button 
                          onClick={() => handleEditUsername(item.id, item.username)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-faint)', padding: 0 }}
                          title="Edit Username manually"
                        >
                          ✎
                        </button>
                      </div>
                    </td>
                    
                    <td>
                      {item.url ? (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="action-btn"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border-light)', borderRadius: '4px' }}
                        >
                          <ExternalLinkIcon /> View
                        </a>
                      ) : '-'}
                    </td>

                    <td>{renderAttr(item.nation)}</td>
                    <td>{renderAttr(item.skinTone)}</td>
                    <td>{renderAttr(item.bodyType)}</td>
                    <td>{renderAttr(item.reelType)}</td>
                    <td>{renderAttr(item.specialPart)}</td>
                    <td>{renderAttr(item.ageRange)}</td>
                    <td className="staging-mono-cell">{item.totalFollowers ? Number(item.totalFollowers).toLocaleString() : '0'}</td>
                    <td className="staging-mono-cell">{item.avgViewsPerWeek ? Number(item.avgViewsPerWeek).toLocaleString() : '0'}</td>
                    <td className="staging-mono-cell">{item.avgLikes ? Number(item.avgLikes).toLocaleString() : '0'}</td>
                    <td className="staging-mono-cell">{item.avgComments ? Number(item.avgComments).toLocaleString() : '0'}</td>
                    
                    <td>
                      <div className="staging-row-actions-group">
                        <button 
                          className="action-btn"
                          style={{ backgroundColor: 'var(--surface-raised)', color: isFailed ? 'var(--accent-red)' : 'var(--text-main)', border: '1px solid var(--border-light)' }}
                          onClick={() => handleProcessAISequence(item.id, item.status)}
                          disabled={isProcessingRow}
                          title="Force Manual AI Refresh"
                        >
                          <SparkleIcon /> {isProcessingRow ? "Scanning..." : isFailed ? "Failed. Retry?" : isPendingAI ? "Waiting..." : "Re-Scan"}
                        </button>
                        <button 
                          className="action-btn staging-approve-btn"
                          onClick={() => handleApprove(item.id)}
                          disabled={isProcessingRow || isPendingAI}
                        >
                          <CheckIcon /> Approve
                        </button>
                        <button 
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(item.id)}
                          disabled={isProcessingRow}
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