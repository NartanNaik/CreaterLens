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
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

// Shared core columns definition
const defaultCoreCols = [
  { id: 'contact', label: 'Contact', type: 'text' },
  { id: 'nation', label: 'Nation', type: 'text' },
  { id: 'skinTone', label: 'Skin Tone', type: 'select' },
  { id: 'bodyType', label: 'Body Type', type: 'select' },
  { id: 'reelType', label: 'Reel Type', type: 'select' },
  { id: 'specialPart', label: 'Special Part', type: 'select' },
  { id: 'ageRange', label: 'Age', type: 'select' },
  { id: 'totalFollowers', label: 'Followers', type: 'number' },
  { id: 'avgViewsPerWeek', label: 'Avg Views', type: 'number' },
  { id: 'avgLikes', label: 'Avg Likes', type: 'number' },
  { id: 'avgComments', label: 'Avg Comments', type: 'number' }
];

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

  // Sync with Dashboard's column edits
  const [hiddenCols, setHiddenCols] = useState(() => {
    return JSON.parse(localStorage.getItem('hiddenCols')) || [];
  });
  
  const [renamedCols, setRenamedCols] = useState(() => {
    return JSON.parse(localStorage.getItem('renamedCols')) || {};
  });
  
  const [contextMenu, setContextMenu] = useState(null);

  // Dynamic Background Video Calculator
  useEffect(() => {
    const calculateVideoCount = () => {
      const videoWidth = window.innerHeight * (9 / 16);
      const count = Math.ceil(window.innerWidth / videoWidth);
      setBgVideoCount(count || 5);
    };

    calculateVideoCount();
    window.addEventListener('resize', calculateVideoCount);
    
    const closeMenu = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', closeMenu);
    
    return () => {
      window.removeEventListener('resize', calculateVideoCount);
      window.removeEventListener('click', closeMenu);
    };
  }, []);

  useEffect(() => {
    fetchStagingQueue(true);
  }, []);

  // Poll local storage to ensure columns stay synced if changed in Dashboard
  useEffect(() => {
    const syncCols = () => {
      setHiddenCols(JSON.parse(localStorage.getItem('hiddenCols')) || []);
      setRenamedCols(JSON.parse(localStorage.getItem('renamedCols')) || {});
    };
    
    window.addEventListener('storage', syncCols);
    
    return () => {
      window.removeEventListener('storage', syncCols);
    };
  }, []);

  useEffect(() => {
    const processNextPendingItem = async () => {
      const pendingItem = stagedItems.find(item => 
        (item.status === 'pending' || item.status === 'scraping_done') && !processingIds.has(item.id)
      );
      
      if (pendingItem && !isAutoProcessingRef.current) {
        isAutoProcessingRef.current = true; 
        // Pass true to indicate this is an automatic background process
        await handleProcessAISequence(pendingItem.id, pendingItem.status, null, true);
        
        setTimeout(() => { 
          isAutoProcessingRef.current = false; 
        }, 6000);
      }
    };
    
    processNextPendingItem();
  }, [stagedItems, processingIds]);

  const fetchStagingQueue = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    
    try {
      const { data } = await api.get('/staging');
      setStagedItems(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch staging queue:", error);
      toast.error("Failed to fetch queue.");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const setRowProcessing = (id, isProcessing) => {
    setProcessingIds(prev => {
      const next = new Set(prev);
      if (isProcessing) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleEditUsername = (id, currentName) => {
    const newName = window.prompt("Edit Username:", currentName === 'Unknown' ? '' : currentName);
    
    if (newName && newName.trim() !== "" && newName !== currentName) {
      const cleanedName = newName.trim();
      setStagedItems(prev => prev.map(item => item.id === id ? { ...item, username: cleanedName } : item));
      handleProcessAISequence(id, 'pending', cleanedName, false);
      toast.success("Username updated!");
    }
  };

  // Added isAuto flag to prevent toast spam when Vercel 502s on background tasks
  const handleProcessAISequence = async (id, currentStatus = 'pending', customUsername = null, isAuto = false) => {
    if (processingIds.has(id)) {
      return;
    }
    
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
      } else if (error.response && error.response.status === 429) {
        setStagedItems(prev => prev.map(item => item.id === id ? { ...item, status: 'pending' } : item));
      } else {
        setStagedItems(prev => prev.map(item => item.id === id ? { ...item, status: 'failed' } : item));
        // Only show error toast if the user manually clicked "Scan"
        if (!isAuto) {
          toast.error("AI Analysis Failed.");
        }
      }
    } finally {
      setRowProcessing(id, false);
    }
  };

  const handleApprove = async (id) => {
    if (processingIds.has(id)) {
      return;
    }
    
    setRowProcessing(id, true);
    
    try {
      await api.post(`/staging/${id}/approve`);
      setStagedItems(prev => prev.filter(item => item.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("Approved!");
    } catch (error) {
      console.error("Failed to approve staged item:", error);
      toast.error("Approval failed.");
    } finally {
      setRowProcessing(id, false);
    }
  };

  const handleDelete = async (id) => {
    if (processingIds.has(id)) {
      return;
    }
    
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
      toast.error("Failed to delete.");
    } finally {
      setRowProcessing(id, false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return stagedItems;
    }
    
    const lower = searchTerm.toLowerCase();
    
    return stagedItems.filter(item => 
      (item.username && item.username.toLowerCase().includes(lower)) || 
      (item.url && item.url.toLowerCase().includes(lower))
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      return;
    }
    
    setLoading(true);
    
    try {
      await api.post('/staging/bulk-approve', { ids: Array.from(selectedIds) });
      setStagedItems(prev => prev.filter(item => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      toast.success("Batch approved!");
    } catch (error) {
      console.error("Bulk approval failed:", error);
      toast.error("Batch fail.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAll = async () => {
    if (stagedItems.length === 0) {
      return;
    }
    
    if (!window.confirm(`Are you sure you want to approve ALL ${stagedItems.length} profiles? This will process in batches.`)) {
      return;
    }
    
    setLoading(true);
    
    const allIds = stagedItems.map(item => item.id);
    setStagedItems([]);
    setSelectedIds(new Set());
    
    // Reduced batch size to 50 to prevent Vercel execution timeouts
    const BATCH_SIZE = 50;

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
    if (stagedItems.length === 0) {
      return;
    }
    
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE ALL ${stagedItems.length} items?`)) {
      return;
    }
    
    setLoading(true);
    
    const allIds = stagedItems.map(item => item.id);
    setStagedItems([]);
    setSelectedIds(new Set());
    
    // Reduced batch size to 50 to prevent Vercel execution timeouts
    const BATCH_SIZE = 50;

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

  const handleContextMenu = (e, colId, colName) => {
    e.preventDefault();
    setContextMenu({ 
      x: e.clientX, 
      y: e.clientY, 
      colId, 
      colName 
    });
  };

  const renderAttr = (attr) => {
    if (!attr) {
      return '-';
    }
    
    if (typeof attr === 'object' && attr !== null) {
      return attr.value || '-';
    }
    
    return attr;
  };

  return (
    <div className="dashboard-container relative flex flex-col h-full overflow-hidden">
      
      {isVideoTheme && (
        <div className="video-bg-container">
          {filteredItems.filter(p => p.videoPreviewUrl || p.url).slice(0, bgVideoCount).map((p, i) => (
            <video 
              key={i} 
              src={p.videoPreviewUrl || p.url} 
              autoPlay 
              loop 
              muted 
              playsInline 
            />
          ))}
        </div>
      )}

      {/* FIXED Header Panel */}
      <div className="glass-panel p-5 mb-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 z-20">
        <div>
          <h1 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>
            Staging Queue
          </h1>
          <p className="text-sm text-gray-500">
            Review AI-extracted profiles before pushing live.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="search-bar-container max-w-xs relative flex items-center">
            <SearchIcon />
            <input 
              type="text" 
              placeholder="Search usernames..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full"
            />
          </div>
          
          <button 
            onClick={() => navigate('/dashboard')} 
            className="action-btn btn-outline"
          >
            <ArrowLeftIcon /> Back to Dashboard
          </button>
          
          <button 
            onClick={() => fetchStagingQueue(true)} 
            disabled={loading} 
            className="action-btn btn-outline"
          >
            <RefreshIcon /> Refresh
          </button>
        </div>
      </div>

      <GarbageEater onSuccess={() => fetchStagingQueue(false)} />

      {selectedIds.size > 0 && (
        <div className="glass-panel p-4 mb-4 flex justify-between items-center flex-shrink-0" style={{ background: '#fdf2f8', borderColor: '#fbcfe8' }}>
          <span className="font-bold text-pink-700">
            {selectedIds.size} items selected
          </span>
          <button onClick={handleBulkApprove} className="action-btn btn-primary">
            <CheckIcon /> Approve Selected
          </button>
        </div>
      )}

      {/* SCROLLABLE Table Layout */}
      <div className="table-wrapper flex-1 overflow-y-auto overflow-x-auto min-h-0">
        <table className="profile-table w-full">
          <thead>
            <tr>
              <th className="w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length} 
                  onChange={handleToggleSelectAll} 
                />
              </th>
              
              {!hiddenCols.includes('username') && (
                <th 
                  onContextMenu={(e) => handleContextMenu(e, 'username', 'Username')} 
                  style={{ cursor: 'pointer' }}
                >
                  Username
                </th>
              )}
              
              {!hiddenCols.includes('link') && (
                <th>Link</th>
              )}
              
              {defaultCoreCols.map(col => {
                if (hiddenCols.includes(col.id)) return null;
                
                const displayLabel = renamedCols[col.id] || col.label;
                
                return (
                  <th 
                    key={col.id} 
                    onContextMenu={(e) => handleContextMenu(e, col.id, displayLabel)} 
                    style={{ cursor: 'pointer' }}
                  >
                    {displayLabel}
                  </th>
                );
              })}
              
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="15" className="text-center py-10 text-gray-400 italic">
                  No profiles currently waiting.
                </td>
              </tr>
            ) : (
              filteredItems.slice(0, 50).map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isProcessingRow = processingIds.has(item.id);
                
                return (
                  <tr 
                    key={item.id} 
                    className={isSelected ? 'bg-pink-50' : ''} 
                    style={{ opacity: isProcessingRow ? 0.6 : 1, pointerEvents: isProcessingRow ? 'none' : 'auto' }}
                  >
                    <td className="text-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => handleToggleSelect(item.id)} 
                      />
                    </td>
                    
                    {!hiddenCols.includes('username') && (
                      <td 
                        className="font-bold text-gray-800 cursor-pointer hover:bg-gray-50 transition-colors" 
                        onClick={() => handleEditUsername(item.id, item.username)}
                      >
                        {item.username || 'Unknown'}
                      </td>
                    )}
                    
                    {!hiddenCols.includes('link') && (
                      <td>
                        {item.url ? (
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="action-btn btn-outline" 
                            style={{ padding: '4px 8px' }}
                          >
                            View
                          </a>
                        ) : '-'}
                      </td>
                    )}
                    
                    {defaultCoreCols.map(col => {
                      if (hiddenCols.includes(col.id)) return null;
                      
                      return (
                        <td key={col.id}>
                          {renderAttr(item[col.id])}
                        </td>
                      );
                    })}
                    
                    <td>
                      <div className="flex justify-end gap-2">
                        <button 
                          className="action-btn btn-outline" 
                          onClick={() => handleProcessAISequence(item.id, item.status, null, false)}
                        >
                          <SparkleIcon /> Scan
                        </button>
                        
                        <button 
                          className="action-btn btn-primary" 
                          style={{ background: '#059669', borderColor: '#059669' }} 
                          onClick={() => handleApprove(item.id)}
                        >
                          <CheckIcon /> Approve
                        </button>
                        
                        <button 
                          className="action-btn btn-danger" 
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

      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div style={{ padding: '4px 8px', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>
            Column: {contextMenu.colName}
          </div>
          
          <button 
            onClick={() => {
              const newName = window.prompt("Rename Core Column:", contextMenu.colName);
              
              if (newName && newName.trim()) {
                const updated = { ...renamedCols, [contextMenu.colId]: newName.trim() };
                setRenamedCols(updated);
                localStorage.setItem('renamedCols', JSON.stringify(updated));
              }
              
              setContextMenu(null);
            }}
          >
            ✎ Rename / Edit
          </button>
          
          <button 
            className="danger"
            onClick={() => {
              if (window.confirm(`Hide ${contextMenu.colName}?`)) {
                const updated = [...hiddenCols, contextMenu.colId];
                setHiddenCols(updated);
                localStorage.setItem('hiddenCols', JSON.stringify(updated));
              }
              
              setContextMenu(null);
            }}
          >
            🗑 Hide Column
          </button>
        </div>
      )}
    </div>
  );
}