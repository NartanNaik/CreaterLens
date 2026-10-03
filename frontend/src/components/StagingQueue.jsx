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
    {/* FIX: points had an odd number of values ("12 19 5 12 5"), so the arrowhead was broken */}
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

// Uses the .search-icon class from the stylesheet (positioned/sized/coloured there)
const SearchIcon = () => (
  <svg className="svg-icon search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const MAX_VISIBLE_ROWS = 50;
const AUTO_PROCESS_DELAY_MS = 6000;

// FIX: JSON.parse on a corrupted/missing localStorage value used to crash the whole page
const readStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

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
  const attemptedRef = useRef(new Set()); // ids already auto-processed this session (prevents infinite loops)
  const mountedRef = useRef(true);
  const [queueTick, setQueueTick] = useState(0); // bumps after the cool-down so the queue continues

  // Sync with Dashboard's column edits
  const [hiddenCols, setHiddenCols] = useState(() => readStorage('hiddenCols', []));
  const [renamedCols, setRenamedCols] = useState(() => readStorage('renamedCols', {}));

  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Dynamic Background Video Calculator + close context menu on click
  useEffect(() => {
    const calculateVideoCount = () => {
      const videoWidth = window.innerHeight * (9 / 16);
      const count = Math.ceil(window.innerWidth / videoWidth);
      setBgVideoCount(count || 5);
    };

    calculateVideoCount();
    window.addEventListener('resize', calculateVideoCount);

    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);

    return () => {
      window.removeEventListener('resize', calculateVideoCount);
      window.removeEventListener('click', closeMenu);
    };
  }, []);

  useEffect(() => {
    fetchStagingQueue(true);
  }, []);

  // Keep columns in sync if changed in another tab/Dashboard
  useEffect(() => {
    const syncCols = () => {
      setHiddenCols(readStorage('hiddenCols', []));
      setRenamedCols(readStorage('renamedCols', {}));
    };
    window.addEventListener('storage', syncCols);
    return () => window.removeEventListener('storage', syncCols);
  }, []);

  /*
    FIX: auto-processing used to stall after the first item. The "busy" ref was
    cleared by a setTimeout, but clearing a ref doesn't re-render, so the effect
    never ran again. We now bump `queueTick` when the cool-down ends. We also
    remember attempted ids so an item whose status never leaves
    pending/scraping_done can't be re-processed forever.
  */
  useEffect(() => {
    if (isAutoProcessingRef.current) return;

    const pendingItem = stagedItems.find(item =>
      (item.status === 'pending' || item.status === 'scraping_done') &&
      !processingIds.has(item.id) &&
      !attemptedRef.current.has(item.id)
    );

    if (!pendingItem) return;

    isAutoProcessingRef.current = true;
    attemptedRef.current.add(pendingItem.id);

    (async () => {
      await handleProcessAISequence(pendingItem.id, pendingItem.status);
      setTimeout(() => {
        isAutoProcessingRef.current = false;
        if (mountedRef.current) setQueueTick(t => t + 1);
      }, AUTO_PROCESS_DELAY_MS);
    })();
  }, [stagedItems, processingIds, queueTick]);

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
    const newName = window.prompt("Edit Username:", currentName === 'Unknown' ? '' : currentName);

    if (newName && newName.trim() !== "" && newName.trim() !== currentName) {
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
      } else if (error.response && error.response.status === 429) {
        // Rate limited: put it back in the queue and let auto-processing retry it later
        attemptedRef.current.delete(id);
        setStagedItems(prev => prev.map(item => item.id === id ? { ...item, status: 'pending' } : item));
      } else {
        setStagedItems(prev => prev.map(item => item.id === id ? { ...item, status: 'failed' } : item));
        toast.error("AI Analysis Failed.");
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

  // Only the rows actually rendered. FIX: "select all" used to select every filtered
  // item, including rows beyond the 50 shown, so "Approve Selected" could approve
  // profiles the user never saw.
  const visibleItems = useMemo(() => filteredItems.slice(0, MAX_VISIBLE_ROWS), [filteredItems]);

  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every(item => selectedIds.has(item.id));

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleItems.map(item => item.id)));
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

  const handleApproveAll = async () => {
    if (stagedItems.length === 0) return;

    if (!window.confirm(`Are you sure you want to approve ALL ${stagedItems.length} profiles? This will process in batches.`)) {
      return;
    }

    setLoading(true);

    const allIds = stagedItems.map(item => item.id);
    setStagedItems([]);
    setSelectedIds(new Set());

    const BATCH_SIZE = 100;

    try {
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        await api.post('/staging/bulk-approve', { ids: allIds.slice(i, i + BATCH_SIZE) });
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

    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE ALL ${stagedItems.length} items?`)) {
      return;
    }

    setLoading(true);

    const allIds = stagedItems.map(item => item.id);
    setStagedItems([]);
    setSelectedIds(new Set());

    const BATCH_SIZE = 100;

    try {
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        await api.post('/staging/bulk-delete', { ids: allIds.slice(i, i + BATCH_SIZE) });
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
      x: Math.min(e.clientX, window.innerWidth - 200),   // keep the menu on-screen
      y: Math.min(e.clientY, window.innerHeight - 130),
      colId,
      colName
    });
  };

  const renderAttr = (attr) => {
    if (!attr) return '-';
    if (typeof attr === 'object') return attr.value || '-';
    return attr;
  };

  // Videos for the themed background. FIX: no longer falls back to item.url (an
  // Instagram page link, not a playable video file).
  const bgVideos = useMemo(
    () => filteredItems.filter(p => p.videoPreviewUrl).slice(0, bgVideoCount),
    [filteredItems, bgVideoCount]
  );

  const usernameLabel = renamedCols.username || 'Username';
  const linkLabel = renamedCols.link || 'Link';

  return (
    <div className="dashboard-container relative flex flex-col h-full overflow-hidden">

      {isVideoTheme && bgVideos.length > 0 && (
        <div className="video-bg-container">
          {bgVideos.map((p) => (
            <video
              key={p.id}
              src={p.videoPreviewUrl}
              autoPlay
              loop
              muted
              playsInline
            />
          ))}
        </div>
      )}

      {/* Header Panel */}
      <div className="glass-panel staging-header-panel p-5 mb-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 z-20">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-main)', margin: 0 }}>
            Staging Queue
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Review AI-extracted profiles before pushing live.
          </p>
        </div>

        <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="search-bar-container" style={{ width: 280, marginBottom: 0 }}>
            <SearchIcon />
            <input
              type="text"
              className="search-input"
              placeholder="Search usernames..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button onClick={() => navigate('/dashboard')} className="action-btn btn-outline">
            <ArrowLeftIcon /> Back to Dashboard
          </button>

          <button onClick={() => fetchStagingQueue(true)} disabled={loading} className="action-btn btn-outline">
            <RefreshIcon /> Refresh
          </button>

          {/* These handlers existed but nothing ever called them */}
          <button onClick={handleApproveAll} disabled={loading || stagedItems.length === 0} className="action-btn btn-primary btn-success">
            <CheckIcon /> Approve All
          </button>

          <button onClick={handleDeleteAll} disabled={loading || stagedItems.length === 0} className="action-btn btn-danger">
            <TrashIcon /> Delete All
          </button>
        </div>
      </div>

      <GarbageEater onSuccess={() => fetchStagingQueue(false)} />

      {selectedIds.size > 0 && (
        <div
          className="glass-panel p-4 mb-4 flex justify-between items-center flex-shrink-0"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', marginBottom: 16, background: 'rgba(253, 242, 248, 0.85)', borderColor: '#fbcfe8' }}
        >
          <span style={{ fontWeight: 700, color: 'var(--primary-hover)' }}>
            {selectedIds.size} items selected
          </span>
          <button onClick={handleBulkApprove} disabled={loading} className="action-btn btn-primary">
            <CheckIcon /> Approve Selected
          </button>
        </div>
      )}

      {/* SCROLLABLE Table Layout */}
      <div className="table-wrapper glass-panel">
        <table className="profile-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleToggleSelectAll}
                />
              </th>

              {!hiddenCols.includes('username') && (
                <th
                  onContextMenu={(e) => handleContextMenu(e, 'username', usernameLabel)}
                  style={{ cursor: 'context-menu' }}
                >
                  {usernameLabel}
                </th>
              )}

              {!hiddenCols.includes('link') && (
                <th
                  onContextMenu={(e) => handleContextMenu(e, 'link', linkLabel)}
                  style={{ cursor: 'context-menu' }}
                >
                  {linkLabel}
                </th>
              )}

              {defaultCoreCols.map(col => {
                if (hiddenCols.includes(col.id)) return null;

                const displayLabel = renamedCols[col.id] || col.label;

                return (
                  <th
                    key={col.id}
                    onContextMenu={(e) => handleContextMenu(e, col.id, displayLabel)}
                    style={{ cursor: 'context-menu' }}
                  >
                    {displayLabel}
                  </th>
                );
              })}

              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={defaultCoreCols.length + 4} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                  {loading ? 'Loading...' : 'No profiles currently waiting.'}
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isProcessingRow = processingIds.has(item.id);

                return (
                  <tr
                    key={item.id}
                    style={{
                      opacity: isProcessingRow ? 0.6 : 1,
                      pointerEvents: isProcessingRow ? 'none' : 'auto',
                      background: isSelected ? 'rgba(244, 114, 168, 0.2)' : undefined
                    }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                      />
                    </td>

                    {!hiddenCols.includes('username') && (
                      <td
                        style={{ fontWeight: 700, cursor: 'pointer' }}
                        title="Click to edit username"
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
                            style={{ padding: '4px 8px', textDecoration: 'none' }}
                          >
                            View <ExternalLinkIcon />
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
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          className="action-btn btn-outline"
                          onClick={() => handleProcessAISequence(item.id, item.status)}
                        >
                          <SparkleIcon />&nbsp;Scan
                        </button>

                        <button
                          className="action-btn btn-primary btn-success"
                          onClick={() => handleApprove(item.id)}
                        >
                          <CheckIcon />&nbsp;Approve
                        </button>

                        <button
                          className="action-btn btn-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          <TrashIcon />&nbsp;Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {filteredItems.length > MAX_VISIBLE_ROWS && (
          <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Showing {MAX_VISIBLE_ROWS} of {filteredItems.length} profiles. Approve or reject some to see more.
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 2000 }}
        >
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
                const updated = Array.from(new Set([...hiddenCols, contextMenu.colId]));
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