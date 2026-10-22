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

// --- GLOBAL CACHE ---
let globalStagingCache = null;
let globalStagingLastFetchTime = 0;
let globalColumnsCache = null; // Staging queue now needs to know the user's dynamic columns too
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export default function StagingQueue() {
  const navigate = useNavigate();
  
  // 1. State initialized from global cache
  const [stagedItems, setStagedItems] = useState(globalStagingCache || []);
  const [customColumns, setCustomColumns] = useState(globalColumnsCache || []); // NEW: Dynamic columns
  const [loading, setLoading] = useState(!globalStagingCache);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  
  const [processingIds, setProcessingIds] = useState(new Set()); 
  const isAutoProcessingRef = useRef(false);

  // User column preferences
  const [hiddenCols, setHiddenCols] = useState(() => JSON.parse(localStorage.getItem('hiddenCols')) || []);
  const [renamedCols, setRenamedCols] = useState(() => JSON.parse(localStorage.getItem('renamedCols')) || {});
  const [contextMenu, setContextMenu] = useState(null);

  // Sync cache when state changes
  useEffect(() => {
    if (stagedItems !== globalStagingCache) {
      globalStagingCache = stagedItems;
    }
  }, [stagedItems]);

  useEffect(() => {
    if (customColumns !== globalColumnsCache) {
      globalColumnsCache = customColumns;
    }
  }, [customColumns]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    fetchStagingQueue(true);
  }, []);

  useEffect(() => {
    const syncCols = () => {
      setHiddenCols(JSON.parse(localStorage.getItem('hiddenCols')) || []);
      setRenamedCols(JSON.parse(localStorage.getItem('renamedCols')) || {});
    };
    window.addEventListener('storage', syncCols);
    return () => window.removeEventListener('storage', syncCols);
  }, []);

  // Automated background processing
  useEffect(() => {
    const processNextPendingItem = async () => {
      const pendingItem = stagedItems.find(item => 
        (item.status === 'pending' || item.status === 'scraping_done') && !processingIds.has(item.id)
      );
      
      if (pendingItem && !isAutoProcessingRef.current) {
        isAutoProcessingRef.current = true; 
        await handleProcessAISequence(pendingItem.id, pendingItem.status, null, true);
        setTimeout(() => { isAutoProcessingRef.current = false; }, 6000);
      }
    };
    
    processNextPendingItem();
  }, [stagedItems, processingIds]);

  const fetchStagingQueue = async (showLoader = true, forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && globalStagingCache && globalColumnsCache && (now - globalStagingLastFetchTime < CACHE_DURATION_MS)) {
      return; 
    }

    if (showLoader) setLoading(true);
    
    try {
      // NEW: Fetch BOTH the staging queue and the user's columns
      const [stagingRes, columnsRes] = await Promise.all([
        api.get('/staging'),
        api.get('/settings/columns')
      ]);

      const fetchedItems = Array.isArray(stagingRes.data) ? stagingRes.data : stagingRes.data.data || [];
      const fetchedColumns = Array.isArray(columnsRes.data) ? columnsRes.data : columnsRes.data.data || [];
      
      globalStagingCache = fetchedItems;
      globalColumnsCache = fetchedColumns;
      globalStagingLastFetchTime = Date.now();
      
      setStagedItems(fetchedItems);
      setCustomColumns(fetchedColumns);
    } catch (error) {
      console.error("Failed to fetch staging queue:", error);
      toast.error("Failed to fetch queue.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const forceRefreshQueue = () => {
    globalStagingCache = null;
    globalColumnsCache = null;
    globalStagingLastFetchTime = 0;
    fetchStagingQueue(true, true);
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
    const newName = window.prompt("Edit Username:", currentName === 'Unknown' ? '' : currentName);
    if (newName && newName.trim() !== "" && newName !== currentName) {
      const cleanedName = newName.trim();
      setStagedItems(prev => prev.map(item => item.id === id ? { ...item, username: cleanedName } : item));
      handleProcessAISequence(id, 'pending', cleanedName, false);
      toast.success("Username updated!");
    }
  };

  const handleProcessAISequence = async (id, currentStatus = 'pending', customUsername = null, isAuto = false) => {
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
      } else if (error.response && error.response.status === 429) {
        setStagedItems(prev => prev.map(item => item.id === id ? { ...item, status: 'pending' } : item));
      } else {
        setStagedItems(prev => prev.map(item => item.id === id ? { ...item, status: 'failed' } : item));
        if (!isAuto) toast.error("AI Analysis Failed.");
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
      toast.success("Approved!");
    } catch (error) {
      console.error("Failed to approve staged item:", error);
      toast.error("Approval failed.");
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
      toast.error("Failed to delete.");
    } finally {
      setRowProcessing(id, false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return stagedItems;
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
      toast.success("Batch approved!");
    } catch (error) {
      console.error("Bulk approval failed:", error);
      toast.error("Batch fail.");
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (e, colId, colName) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, colId, colName });
  };

  // Safe renderer for values that might be raw objects from the AI
  const renderAttr = (attr) => {
    if (attr === null || attr === undefined || attr === '') return '-';
    if (typeof attr === 'object') return attr.value || '-';
    return String(attr);
  };

  return (
    <div className="dashboard-container relative flex flex-col h-full overflow-hidden">
      
      {/* FIXED Header Panel (Rebranded for CreatorLens / No Video Theme) */}
      <div className="glass-panel p-5 mb-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 z-20">
        <div>
          <h1 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>
            Staging Queue
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Review AI-extracted profiles before pushing live.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="search-bar-container max-w-xs relative flex items-center" style={{ marginBottom: 0 }}>
            <SearchIcon />
            <input 
              type="text" 
              placeholder="Search usernames..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="search-input"
            />
          </div>
          
          <button onClick={() => navigate('/dashboard')} className="action-btn">
            <ArrowLeftIcon /> Dashboard
          </button>
          
          <button onClick={forceRefreshQueue} disabled={loading} className="action-btn">
            <RefreshIcon /> Refresh
          </button>
        </div>
      </div>

      <GarbageEater onSuccess={() => fetchStagingQueue(false, true)} />

      {selectedIds.size > 0 && (
        <div className="glass-panel p-4 mb-4 flex justify-between items-center flex-shrink-0" style={{ background: 'rgba(99, 102, 241, 0.1)', borderColor: 'var(--primary-soft)' }}>
          <span className="font-bold" style={{ color: 'var(--primary-soft)' }}>
            {selectedIds.size} items selected
          </span>
          <button onClick={handleBulkApprove} className="action-btn btn-primary">
            <CheckIcon /> Approve Selected
          </button>
        </div>
      )}

      {/* SCROLLABLE Table Layout (Dynamic Columns) */}
      <div className="table-wrapper flex-1 overflow-y-auto overflow-x-auto min-h-0 glass-panel" style={{ padding: 0 }}>
        <table className="staging-table w-full">
          <thead>
            <tr>
              <th className="w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length} 
                  onChange={handleToggleSelectAll} 
                />
              </th>
              
              {/* Dynamic Headers */}
              {customColumns.map(col => {
                if (hiddenCols.includes(col.columnId)) return null;
                const displayLabel = renamedCols[col.columnId] || col.displayName;
                return (
                  <th 
                    key={col.columnId} 
                    onContextMenu={(e) => handleContextMenu(e, col.columnId, displayLabel)} 
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
                <td colSpan={customColumns.length + 2} className="text-center py-10 italic" style={{ color: 'var(--text-faint)' }}>
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
                    style={{ 
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      opacity: isProcessingRow ? 0.6 : 1, 
                      pointerEvents: isProcessingRow ? 'none' : 'auto' 
                    }}
                  >
                    <td className="text-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => handleToggleSelect(item.id)} 
                      />
                    </td>
                    
                    {/* Dynamic Cells */}
                    {customColumns.map(col => {
                      if (hiddenCols.includes(col.columnId)) return null;

                      // Core Username
                      if (col.columnId === 'username') {
                        return (
                          <td 
                            key={col.columnId}
                            className="font-bold cursor-pointer"
                            style={{ color: 'var(--text-light)' }} 
                            onClick={() => handleEditUsername(item.id, item.username)}
                          >
                            {item.username || 'Unknown'}
                          </td>
                        );
                      }

                      // Core Link
                      if (col.columnId === 'link') {
                        return (
                          <td key={col.columnId}>
                            {item.url ? (
                              <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="action-btn" 
                                style={{ padding: '4px 8px' }}
                              >
                                View
                              </a>
                            ) : '-'}
                          </td>
                        );
                      }

                      // Dynamic attributes (either core like nation/followers, or custom AI categories)
                      const val = col.isCustom ? item.customCategories?.[col.columnId] : item[col.columnId];
                      return <td key={col.columnId}>{renderAttr(val)}</td>;
                    })}
                    
                    <td>
                      <div className="flex justify-end gap-2">
                        <button className="action-btn" onClick={() => handleProcessAISequence(item.id, item.status, null, false)}>
                          <SparkleIcon /> Scan
                        </button>
                        
                        <button className="action-btn btn-primary" onClick={() => handleApprove(item.id)}>
                          <CheckIcon /> Approve
                        </button>
                        
                        <button className="action-btn btn-danger" onClick={() => handleDelete(item.id)}>
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
          <div className="context-menu-title">
            Column: {contextMenu.colName}
          </div>
          
          <button 
            onClick={() => {
              const newName = window.prompt("Rename Column:", contextMenu.colName);
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