import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import GarbageEater from './GarbageEater';

// --- Clean SVG Icons ---
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
const SearchIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, cursor: 'pointer', flexShrink: 0 }}>
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

export default function StagingQueue() {
  const navigate = useNavigate();
  // Read video theme state from App.jsx Layout
  const { isVideoTheme } = useOutletContext() || { isVideoTheme: false };
  
  const [stagedItems, setStagedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [bgVideoCount, setBgVideoCount] = useState(5);
  
  const [processingIds, setProcessingIds] = useState(new Set()); 
  const isAutoProcessingRef = useRef(false);

  // Dynamic Background Video Calculator
  useEffect(() => {
    const calculateVideoCount = () => {
      const videoWidth = window.innerHeight * (9 / 16);
      const count = Math.ceil(window.innerWidth / videoWidth);
      setBgVideoCount(count || 5);
    };

    calculateVideoCount();
    window.addEventListener('resize', calculateVideoCount);
    return () => window.removeEventListener('resize', calculateVideoCount);
  }, []);

  useEffect(() => {
    fetchStagingQueue(true);
  }, []);

  useEffect(() => {
    const processNextPendingItem = async () => {
      const pendingItem = stagedItems.find(item => 
        (item.status === 'pending' || item.status === 'scraping_done') && !processingIds.has(item.id)
      );
      
      if (pendingItem && !isAutoProcessingRef.current) {
        isAutoProcessingRef.current = true; 
        await handleProcessAISequence(pendingItem.id, pendingItem.status);
        setTimeout(() => { isAutoProcessingRef.current = false; }, 6000);
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
      toast.error("Failed to fetch queue.");
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
      toast.success("Username updated!");
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
      if (error.response && error.response.status === 404) {
        setStagedItems(prev => prev.filter(item => item.id !== id));
      } else {
        if (error.response && error.response.status === 429) {
          setStagedItems(prev => prev.map(item => item.id === id ? { ...item, status: 'pending' } : item));
        } else {
          setStagedItems(prev => prev.map(item => item.id === id ? { ...item, status: 'failed' } : item));
          toast.error("AI Analysis Failed.");
        }
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
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      toast.success("Profile approved!");
    } catch (error) {
      console.error("Failed to approve staged item:", error);
      toast.error("Approval failed. Please try again.");
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
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      toast.success("Item deleted from queue.");
    } catch (error) {
      console.error("Failed to delete staged item:", error);
      toast.error("Failed to delete item.");
    } finally {
      setRowProcessing(id, false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return stagedItems;
    const lower = searchTerm.toLowerCase();
    return stagedItems.filter(item => 
      (item.username && item.username.toLowerCase().includes(lower)) ||
      (item.url && item.url.toLowerCase().includes(lower)) ||
      (item.id && item.id.toLowerCase().includes(lower))
    );
  }, [stagedItems, searchTerm]);

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      toast.success("Selected items approved!");
    } catch (error) {
      console.error("Bulk approval failed:", error);
      toast.error("Bulk approval failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAll = async () => {
    if (stagedItems.length === 0) return;
    if (!window.confirm(`Are you sure you want to approve ALL ${stagedItems.length} profiles? This will process in batches.`)) return;
    
    setLoading(true);
    const allIds = stagedItems.map(item => item.id);
    setStagedItems([]);
    setSelectedIds(new Set());
    const BATCH_SIZE = 100;

    try {
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batch = allIds.slice(i, i + BATCH_SIZE);
        await api.post('/staging/bulk-approve', { ids: batch });
      }
      toast.success("All items successfully approved!");
    } catch (error) {
      console.error("A batch failed during Approve All:", error);
      toast.error("A batch failed to process.");
      fetchStagingQueue(false); 
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (stagedItems.length === 0) return;
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE ALL ${stagedItems.length} items?`)) return;
    
    setLoading(true);
    const allIds = stagedItems.map(item => item.id);
    setStagedItems([]);
    setSelectedIds(new Set());
    const BATCH_SIZE = 100;

    try {
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batch = allIds.slice(i, i + BATCH_SIZE);
        await api.post('/staging/bulk-delete', { ids: batch });
      }
      toast.success("All items permanently deleted.");
    } catch (error) {
      console.error("A batch failed during Delete All:", error);
      toast.error("A batch failed to delete.");
      fetchStagingQueue(false);
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
    // Updated Main Wrapper for scroll lock
    <div className="staging-page-container relative h-full flex flex-col" style={{ height: 'calc(100vh - 70px)' }}>
      
      {/* DYNAMIC VIDEO BACKGROUND */}
      {isVideoTheme && (
        <div className="fixed inset-0 z-[-1] flex overflow-hidden opacity-30 pointer-events-none" style={{ background: '#000' }}>
          {filteredItems
            .filter(p => p.videoPreviewUrl || p.url)
            .slice(0, bgVideoCount)
            .map((p, i) => (
              <video 
                key={i} 
                src={p.videoPreviewUrl || p.url} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="h-full object-cover flex-1 opacity-70 filter blur-[2px]"
                style={{ minWidth: `${window.innerHeight * (9/16)}px` }}
              />
          ))}
        </div>
      )}

      {/* FIXED Header Panel */}
      <div className="staging-header-panel glass-panel flex-shrink-0" style={{ zIndex: 20 }}>
        <div className="staging-header-left">
          <div className="staging-icon-wrap"><LayersIcon /></div>
          <div>
            <h1 className="staging-title">Staging Queue</h1>
            <p className="staging-subtitle">Review and approve ingested profiles before pushing to live production.</p>
          </div>
        </div>

        <div className="staging-header-actions">
          <div style={{ position: 'relative', marginRight: '8px' }}>
            <SearchIcon />
            <input 
              type="text" 
              placeholder="Search ID, username..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px 8px 32px', borderRadius: '6px',
                border: '1px solid var(--border-light)', backgroundColor: 'var(--surface-sunken)',
                color: 'var(--text-main)', fontSize: '13px', outline: 'none', width: '240px'
              }}
            />
          </div>

          <button onClick={() => navigate('/dashboard')} className="staging-refresh-btn" style={{ backgroundColor: 'var(--surface-sunken)', color: 'var(--text-main)', border: '1px solid var(--border-light)' }}>
            <ArrowLeftIcon /> Back to Dashboard
          </button>
          
          <button onClick={() => fetchStagingQueue(true)} disabled={loading} className="staging-refresh-btn">
            <RefreshIcon /> {loading ? 'Refreshing...' : 'Refresh Queue'}
          </button>

          <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '12px', marginLeft: '4px', display: 'flex', gap: '8px' }}>
            <button onClick={handleApproveAll} disabled={loading || stagedItems.length === 0} className="staging-bulk-approve-btn">
              <CheckIcon /> Approve All
            </button>
            <button onClick={handleDeleteAll} disabled={loading || stagedItems.length === 0} className="action-btn delete-btn" style={{ backgroundColor: 'var(--surface-raised)' }}>
              <TrashIcon /> Delete All
            </button>
          </div>
        </div>
      </div>

      <GarbageEater onSuccess={() => fetchStagingQueue(false)} />

      {selectedIds.size > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: 'var(--surface-raised)', borderRadius: '8px', border: '1px solid var(--border-accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{selectedIds.size} items selected</span>
          <button onClick={handleBulkApprove} className="staging-bulk-approve-btn"><CheckIcon /> Approve Selected</button>
        </div>
      )}

      {/* SCROLLABLE Table Wrapper */}
      <div className="table-wrapper glass-panel flex-1" style={{ overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
        <table className="profile-table staging-table w-full text-left" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="staging-col-checkbox" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>
                <input 
                  type="checkbox"
                  checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                  onChange={handleToggleSelectAll}
                  className="staging-checkbox"
                />
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Username</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Link</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Contact</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Nation</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Skin Tone</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Body Type</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Reel Type</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Special Part</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Age</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Followers</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Avg Views</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Avg Likes</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Avg Comments</th>
              <th className="staging-col-actions" style={{ minWidth: '320px', position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-color, #fff)', borderBottom: '2px solid var(--border-light)' }}>Actions</th>
            </tr>
          </thead>
          
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="15" className="staging-empty-row">
                  {loading ? "Loading staging queue..." : searchTerm ? "No items match your search." : "No profiles currently waiting in the staging queue."}
                </td>
              </tr>
            ) : (
              filteredItems.slice(0, 50).map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isProcessingRow = processingIds.has(item.id);
                const isPendingAI = item.status === 'pending' || item.status === 'scraping_done';
                const isFailed = item.status === 'failed';
                
                return (
                  <tr key={item.id} className={isSelected ? 'staging-row-selected' : ''} style={{ opacity: isProcessingRow ? 0.6 : 1, pointerEvents: isProcessingRow ? 'none' : 'auto', borderBottom: '1px solid var(--border-light)' }}>
                    <td>
                      <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(item.id)} className="staging-checkbox" />
                    </td>
                    
                    {/* Updated Username Cell with SVG Pencil */}
                    <td className="staging-username-cell group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: item.username === 'Unknown' ? 'bold' : 'normal', color: item.username === 'Unknown' ? 'var(--accent-red)' : 'inherit' }}>
                          {item.username || 'Unknown'}
                        </span>
                        <button 
                          onClick={() => handleEditUsername(item.id, item.username)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          title="Edit Username manually"
                        >
                          <PencilIcon />
                        </button>
                      </div>
                    </td>
                    
                    <td>
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noreferrer" className="action-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border-light)', borderRadius: '4px' }}>
                          <ExternalLinkIcon /> View
                        </a>
                      ) : '-'}
                    </td>

                    {/* New Contact Column */}
                    <td>{renderAttr(item.contact)}</td>

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
                        <button className="action-btn" style={{ backgroundColor: 'var(--surface-raised)', color: isFailed ? 'var(--accent-red)' : 'var(--text-main)', border: '1px solid var(--border-light)' }} onClick={() => handleProcessAISequence(item.id, item.status)} disabled={isProcessingRow} title="Force Manual AI Refresh">
                          <SparkleIcon /> {isProcessingRow ? "Scanning..." : isFailed ? "Failed. Retry?" : isPendingAI ? "Waiting..." : "Re-Scan"}
                        </button>
                        <button className="action-btn staging-approve-btn" onClick={() => handleApprove(item.id)} disabled={isProcessingRow || isPendingAI}>
                          <CheckIcon /> Approve
                        </button>
                        <button className="action-btn delete-btn" onClick={() => handleDelete(item.id)} disabled={isProcessingRow}>
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