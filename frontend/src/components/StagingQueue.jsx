import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import GarbageEater from './GarbageEater';
import { withCoreColumns, isCoreColumn, readStorage, writeStorage } from '../utils/tableColumns';
import { registerSessionReset, getSessionEpoch } from '../utils/session';

// --- Clean SVG Icons ---
const ExternalLinkIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

const SparkleIcon = () => (
  <svg className="svg-icon icon-mr-4" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
  </svg>
);

const CheckIcon = () => (
  <svg className="svg-icon icon-mr-4" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const TrashIcon = () => (
  <svg className="svg-icon icon-mr-4" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const RefreshIcon = () => (
  <svg className="svg-icon icon-mr-6" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

const SearchIcon = () => (
  <svg className="svg-icon search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const EditIcon = () => (
  <svg className="svg-icon icon-mr-8" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const EyeOffIcon = () => (
  <svg className="svg-icon icon-mr-8" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

// --- GLOBAL CACHE ---
let globalStagingCache = null;
let globalStagingLastFetchTime = 0;
let globalColumnsCache = null;
const CACHE_DURATION_MS = 5 * 60 * 1000;

// Logging out / signing in as someone else must never reuse the previous account's data.
registerSessionReset(() => {
  globalStagingCache = null;
  globalColumnsCache = null;
  globalStagingLastFetchTime = 0;
});

const toArray = (res) => (Array.isArray(res.data) ? res.data : res.data?.data || []);

export default function StagingQueue() {
  const [stagedItems, setStagedItems] = useState(globalStagingCache || []);
  const [customColumns, setCustomColumns] = useState(globalColumnsCache || []);
  const [loading, setLoading] = useState(!globalStagingCache);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const [processingIds, setProcessingIds] = useState(new Set());
  const isAutoProcessingRef = useRef(false);

  const [hiddenCols, setHiddenCols] = useState(() => readStorage('hiddenCols', []));
  const [renamedCols, setRenamedCols] = useState(() => readStorage('renamedCols', {}));
  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);

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

  // Position the context menu through CSS custom properties (no inline style prop).
  useLayoutEffect(() => {
    if (contextMenu && menuRef.current) {
      menuRef.current.style.setProperty('--menu-x', `${contextMenu.x}px`);
      menuRef.current.style.setProperty('--menu-y', `${contextMenu.y}px`);
    }
  }, [contextMenu]);

  useEffect(() => {
    fetchStagingQueue(true);
  }, []);

  useEffect(() => {
    const syncCols = () => {
      setHiddenCols(readStorage('hiddenCols', []));
      setRenamedCols(readStorage('renamedCols', {}));
    };
    window.addEventListener('storage', syncCols);
    return () => window.removeEventListener('storage', syncCols);
  }, []);

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
    const epochAtStart = getSessionEpoch();

    // allSettled: a failing /settings/columns must not hide the queue (and vice versa).
    const [stagingRes, columnsRes] = await Promise.allSettled([
      api.get('/staging'),
      api.get('/settings/columns')
    ]);

    // The account changed while the request was in flight: drop this result.
    if (epochAtStart !== getSessionEpoch()) return;

    let bothOk = true;

    if (stagingRes.status === 'fulfilled') {
      const fetchedItems = toArray(stagingRes.value);
      globalStagingCache = fetchedItems;
      setStagedItems(fetchedItems);
    } else {
      bothOk = false;
      console.error("Failed to fetch staging queue:", stagingRes.reason);
      toast.error("Failed to fetch queue.");
    }

    if (columnsRes.status === 'fulfilled') {
      const fetchedColumns = toArray(columnsRes.value);
      globalColumnsCache = fetchedColumns;
      setCustomColumns(fetchedColumns);
    } else {
      bothOk = false;
      console.error("Failed to fetch columns:", columnsRes.reason);
      toast.error("Couldn't load custom columns. Showing defaults.");
    }

    // Only cache a fully successful fetch so a failure is retried on the next visit.
    if (bothOk) globalStagingLastFetchTime = Date.now();
    else globalStagingLastFetchTime = 0;

    if (showLoader) setLoading(false);
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

  // Username + Link are force-prepended; core columns can never be hidden.
  const columns = useMemo(
    () => withCoreColumns(customColumns).filter(col => isCoreColumn(col.columnId) || !hiddenCols.includes(col.columnId)),
    [customColumns, hiddenCols]
  );

  const hiddenCount = hiddenCols.filter(id => !isCoreColumn(id)).length;

  const handleShowHiddenColumns = () => {
    const next = hiddenCols.filter(isCoreColumn);
    setHiddenCols(next);
    writeStorage('hiddenCols', next);
  };

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
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 130),
      colId,
      colName
    });
  };

  const renderAttr = (attr) => {
    if (attr === null || attr === undefined || attr === '') return '-';
    if (typeof attr === 'object') return attr.value || '-';
    return String(attr);
  };

  const emptyMessage = loading ? 'Loading...' : 'No profiles currently waiting.';

  return (
    <div className="dashboard-container">

      <div className="dashboard-toolbar toolbar-compact glass-panel">
        <div className="dashboard-title-group">
          <h1>Staging Queue</h1>
          <p>Review AI-extracted profiles before pushing live.</p>
        </div>

        <div className="toolbar-actions">
          <div className="search-bar-container toolbar-search">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search usernames..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {hiddenCount > 0 && (
            <button onClick={handleShowHiddenColumns} className="action-btn">
              Show hidden columns ({hiddenCount})
            </button>
          )}

          <button onClick={forceRefreshQueue} disabled={loading} className="action-btn">
            <RefreshIcon /> Refresh
          </button>
        </div>
      </div>

      <div className="garbage-wrapper">
        <GarbageEater onSuccess={() => fetchStagingQueue(false, true)} />
      </div>

      {selectedIds.size > 0 && (
        <div className="bulk-selection-bar">
          <span className="bulk-selection-text">
            {selectedIds.size} items selected
          </span>
          <button onClick={handleBulkApprove} className="action-btn btn-success">
            <CheckIcon /> Approve Selected
          </button>
        </div>
      )}

      <div className="table-wrapper glass-panel">
        <table className="staging-table">
          <thead>
            <tr>
              <th className="col-checkbox">
                <input
                  type="checkbox"
                  checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                  onChange={handleToggleSelectAll}
                />
              </th>

              {columns.map(col => {
                const displayLabel = renamedCols[col.columnId] || col.displayName;
                return (
                  <th
                    key={col.columnId}
                    onContextMenu={(e) => handleContextMenu(e, col.columnId, displayLabel)}
                  >
                    {displayLabel}
                  </th>
                );
              })}

              <th className="cell-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="table-empty-state">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredItems.slice(0, 50).map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isProcessingRow = processingIds.has(item.id);
                const rowClass = [isSelected && 'row-selected', isProcessingRow && 'row-processing']
                  .filter(Boolean)
                  .join(' ');

                return (
                  <tr key={item.id} className={rowClass}>
                    <td className="cell-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                      />
                    </td>

                    {columns.map(col => {
                      if (col.columnId === 'username') {
                        return (
                          <td
                            key={col.columnId}
                            onClick={() => handleEditUsername(item.id, item.username)}
                            className="td-username"
                          >
                            {item.username || 'Unknown'}
                          </td>
                        );
                      }

                      if (col.columnId === 'link') {
                        return (
                          <td key={col.columnId}>
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="action-btn link-btn"
                              >
                                <ExternalLinkIcon /> View
                              </a>
                            ) : '-'}
                          </td>
                        );
                      }

                      const val = col.isCustom ? item.customCategories?.[col.columnId] : item[col.columnId];
                      return <td key={col.columnId}>{renderAttr(val)}</td>;
                    })}

                    <td className="cell-right">
                      <div className="table-action-group">
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
        <div className="context-menu" ref={menuRef}>
          <div className="context-menu-title">
            Column: {contextMenu.colName}
          </div>

          <button
            onClick={() => {
              const newName = window.prompt("Rename Column:", contextMenu.colName);
              if (newName && newName.trim()) {
                const updated = { ...renamedCols, [contextMenu.colId]: newName.trim() };
                setRenamedCols(updated);
                writeStorage('renamedCols', updated);
              }
              setContextMenu(null);
            }}
          >
            <EditIcon /> Edit / Rename
          </button>

          {!isCoreColumn(contextMenu.colId) && (
            <button
              className="danger"
              onClick={() => {
                if (window.confirm(`Hide ${contextMenu.colName}?`)) {
                  const updated = Array.from(new Set([...hiddenCols, contextMenu.colId]));
                  setHiddenCols(updated);
                  writeStorage('hiddenCols', updated);
                }
                setContextMenu(null);
              }}
            >
              <EyeOffIcon /> Hide Column
            </button>
          )}
        </div>
      )}
    </div>
  );
}