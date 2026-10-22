import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AverageViewsModal from './AverageViewsModal';
import CustomCategoryBuilder from './CustomCategoryBuilder';
import ProfileChecker from './ProfileChecker';
import ManageCategoryModal from './ManageCategoryModal';
import EditableCell from './EditableCell';
import MassUploadModal from './MassUploadModal';
import DragFillOverlay from './DragFillOverlay';
import useDragFill from '../hooks/useDragFill';
import api from '../services/api';

// --- Clean SVG Icons ---
const LayersIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);
const ExternalLinkIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);
const SearchIcon = () => (
  <svg className="svg-icon search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const PlusIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const UploadCloudIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <polyline points="16 16 12 12 8 16"></polyline>
    <line x1="12" y1="12" x2="12" y2="21"></line>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
  </svg>
);
const CopyIcon = () => (
  <svg className="svg-icon copy-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);
const TrashIcon = () => (
  <svg className="svg-icon delete-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const BATCH_SIZE = 10;

// --- GLOBAL CACHE (Prevents Firebase reads on tab switch) ---
let globalProfilesCache = null;
let globalColumnsCache = null;
let globalLastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// --- helpers ---
const readStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
};

const request = async (path, { method = 'GET', data } = {}) => {
  try {
    const res = await api.request({ url: path, method, data });
    return { json: async () => res.data };
  } catch (error) {
    const message = error.response?.data?.error || error.message || `Request failed`;
    throw new Error(message);
  }
};

const applyValue = (profile, key, value, isCustom) =>
  isCustom
    ? { ...profile, customCategories: { ...(profile.customCategories || {}), [key]: value } }
    : { ...profile, [key]: value };

const isNil = (v) => v === null || v === undefined || v === '';

const compareValues = (a, b) => {
  if (typeof a === 'boolean') a = Number(a);
  if (typeof b === 'boolean') b = Number(b);
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

const copyText = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (!ok) throw new Error('copy failed');
};

export default function ProfileDashboard() {
  const navigate = useNavigate();
  const { updateGlobalCount } = useOutletContext() || {};

  // 1. Initialize state with global cache
  const [profiles, setProfiles] = useState(globalProfilesCache || []);
  const [customColumns, setCustomColumns] = useState(globalColumnsCache || []);
  const [fetching, setFetching] = useState(!globalProfilesCache);
  const [deleting, setDeleting] = useState(false);

  const [isAvgCalcOpen, setIsAvgCalcOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const [isManageColOpen, setIsManageColOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);

  const [isMassUploadOpen, setIsMassUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const [contextMenu, setContextMenu] = useState(null);

  const [hiddenCols, setHiddenCols] = useState(() => readStorage('hiddenCols', []));
  const [renamedCols, setRenamedCols] = useState(() => readStorage('renamedCols', {}));

  // 2. Keep the global cache automatically synchronized with any edits/deletes
  useEffect(() => {
    if (profiles !== globalProfilesCache) {
      globalProfilesCache = profiles;
    }
    if (updateGlobalCount) {
      updateGlobalCount(profiles.length);
    }
  }, [profiles, updateGlobalCount]);

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
    fetchData();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('hiddenCols', JSON.stringify(hiddenCols));
      localStorage.setItem('renamedCols', JSON.stringify(renamedCols));
    } catch (e) {
      console.error('Could not persist column settings:', e);
    }
  }, [hiddenCols, renamedCols]);

  const fetchData = async () => {
    // 3. Skip fetching if cache is valid (saving Firebase reads)
    const now = Date.now();
    if (globalProfilesCache && globalColumnsCache && (now - globalLastFetchTime < CACHE_DURATION_MS)) {
      return; 
    }

    setFetching(true);
    try {
      const [profilesRes, columnsRes] = await Promise.all([
        request('/profiles'),
        request('/settings/columns')
      ]);

      const profilesData = await profilesRes.json();
      const columnsData = await columnsRes.json();

      const fetchedProfiles = Array.isArray(profilesData) ? profilesData : (profilesData.data || []);
      const fetchedColumns = Array.isArray(columnsData) ? columnsData : (columnsData.data || []);

      // 4. Update the cache with fresh data
      globalProfilesCache = fetchedProfiles;
      globalColumnsCache = fetchedColumns;
      globalLastFetchTime = Date.now();

      setProfiles(fetchedProfiles);
      setCustomColumns(fetchedColumns);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(error.message || "Failed to load profiles.");
      setProfiles([]);
      setCustomColumns([]);
    } finally {
      setFetching(false);
    }
  };

  const handleProfileAdded = (newProfile) => {
    setProfiles(prev => [newProfile, ...prev]);
  };

  const handleSaveAverage = async (id, newAverage) => {
    const previous = profiles.find(p => p.id === id);
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, avgViewsPerWeek: newAverage } : p));

    try {
      await request(`/profiles/${id}`, {
        method: 'PATCH',
        data: ({ avgViewsPerWeek: newAverage })
      });
    } catch (error) {
      console.error("Failed to save avg views:", error);
      toast.error("Failed to save average views.");
      if (previous) setProfiles(prev => prev.map(p => p.id === id ? { ...p, avgViewsPerWeek: previous.avgViewsPerWeek } : p));
    }
  };

  const handleSaveNewCategory = async (categoryData) => {
    try {
      const response = await request('/settings/columns', {
        method: 'POST',
        data: (categoryData)
      });
      const result = await response.json();
      setCustomColumns(prev => [...prev, result.column]);
      toast.success("Category added!");
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error(error.message || "Failed to add category");
    }
  };

  const handleDeleteCategory = async (columnToDelete) => {
    try {
      await request('/settings/columns', {
        method: 'DELETE',
        data: (columnToDelete)
      });
      setCustomColumns(prev => prev.filter(col => col.columnId !== columnToDelete.columnId));
      toast.success("Column deleted!");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error(error.message || "Failed to delete column");
    }
  };

  const handleDeleteRow = async (id) => {
    if (!window.confirm("Delete this profile?")) return;

    const removed = profiles.find(p => p.id === id);
    setProfiles(prev => prev.filter(p => p.id !== id));

    try {
      await request(`/profiles/${id}`, { method: 'DELETE' });
      toast.success("Profile deleted");
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete profile.");
      if (removed) setProfiles(prev => [removed, ...prev]); // roll back
    }
  };

  const handleCopyRow = (profile) => {
    copyText(profile.username)
      .then(() => toast.success(`@${profile.username} copied!`))
      .catch(() => toast.error('Failed to copy'));
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedProfiles = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const isCustomSort = customColumns.some(col => col.columnId === sortConfig.key);
    const dir = sortConfig.direction === 'asc' ? 1 : -1;

    const getValue = (p) => isCustomSort ? p.customCategories?.[sortConfig.key] : p[sortConfig.key];

    const processed = profiles.filter(p => {
      const username = (p.username || '').toLowerCase();
      const nation = (p.nation || '').toLowerCase();
      return username.includes(query) || nation.includes(query);
    });

    processed.sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (isNil(av) && isNil(bv)) return 0;
      if (isNil(av)) return 1;
      if (isNil(bv)) return -1;
      return compareValues(av, bv) * dir;
    });

    return processed;
  }, [profiles, searchQuery, sortConfig, customColumns]);

  const handleCopyAll = () => {
    if (filteredAndSortedProfiles.length === 0) return;
    const textToCopy = filteredAndSortedProfiles.map(p => p.username).join('\n');
    copyText(textToCopy)
      .then(() => toast.success(`Copied ${filteredAndSortedProfiles.length} usernames!`))
      .catch(() => toast.error('Failed to copy'));
  };

  const handleDeleteAll = async () => {
    if (filteredAndSortedProfiles.length === 0) return;
    if (!window.confirm(`Permanently delete all ${filteredAndSortedProfiles.length} visible profiles?`)) return;

    setDeleting(true);
    const toDelete = filteredAndSortedProfiles;
    const idsToDelete = new Set(toDelete.map(p => p.id));
    setProfiles(prev => prev.filter(p => !idsToDelete.has(p.id)));

    const failed = [];
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(p => request(`/profiles/${p.id}`, { method: 'DELETE' }))
      );
      results.forEach((r, idx) => {
        if (r.status === 'rejected') failed.push(batch[idx]);
      });
    }

    if (failed.length > 0) {
      setProfiles(prev => [...failed, ...prev]); 
      toast.error(`${failed.length} profile(s) could not be deleted.`);
    } else {
      toast.success(`Deleted ${toDelete.length} profiles!`);
    }
    setDeleting(false);
  };

  const handleCellEdit = async (profileId, field, newValue, isCustom = false) => {
    const original = profiles.find(p => p.id === profileId);
    if (!original) return;

    const updated = applyValue(original, field, newValue, isCustom);
    setProfiles(prev => prev.map(p => p.id === profileId ? applyValue(p, field, newValue, isCustom) : p));

    const payload = isCustom
      ? { customCategories: updated.customCategories }
      : { [field]: newValue };

    try {
      await request(`/profiles/${profileId}`, { method: 'PATCH', data: (payload) });
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      toast.error(`Failed to save ${field}.`);
      setProfiles(prev => prev.map(p => p.id === profileId ? original : p)); 
    }
  };

  const dragFill = useDragFill(async (startIdx, endIdx, columnKey, newValue) => {
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    const affected = filteredAndSortedProfiles.slice(lo, hi + 1);
    if (affected.length === 0) return;

    const isCustom = customColumns.some(col => col.columnId === columnKey);
    const originals = new Map(affected.map(p => [p.id, p]));

    setProfiles(prev => prev.map(p => originals.has(p.id) ? applyValue(p, columnKey, newValue, isCustom) : p));

    const results = await Promise.allSettled(affected.map(profile => {
      const next = applyValue(profile, columnKey, newValue, isCustom);
      const payload = isCustom
        ? { customCategories: next.customCategories }
        : { [columnKey]: newValue };
      return request(`/profiles/${profile.id}`, { method: 'PATCH', data: (payload) });
    }));

    const failedIds = new Set(
      results.map((r, i) => (r.status === 'rejected' ? affected[i].id : null)).filter(Boolean)
    );

    if (failedIds.size > 0) {
      toast.error(`${failedIds.size} row(s) failed to save.`);
      setProfiles(prev => prev.map(p => failedIds.has(p.id) ? originals.get(p.id) : p));
    }
  });

  const handleContextMenu = (e, colId, colName, isCustom) => {
    e.preventDefault();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 130),
      colId,
      colName,
      isCustom
    });
  };

  const dragProps = (index, key, value) => ({
    onMouseDown: () => dragFill.handleMouseDown(index, key, value),
    onMouseEnter: () => dragFill.handleMouseEnter(index, key),
    onMouseUp: () => dragFill.handleMouseUp(index, key)
  });

  const renderHeader = (label, sortKey, isCustom = false, sortable = true) => {
    if (hiddenCols.includes(sortKey)) return null;
    const displayLabel = renamedCols[sortKey] || label;

    return (
      <th
        key={sortKey}
        onClick={sortable ? () => handleSort(sortKey) : undefined}
        onContextMenu={(e) => handleContextMenu(e, sortKey, displayLabel, isCustom)}
        className={sortable ? 'sortable-header' : undefined}
        style={{ whiteSpace: 'nowrap', cursor: sortable ? 'pointer' : 'context-menu' }}
      >
        {displayLabel}
        {sortable && sortConfig.key === sortKey ? (sortConfig.direction === 'asc' ? ' ↑' : ' ↓') : ''}
      </th>
    );
  };

  const renderCoreCell = (col, profile, index) => {
    if (hiddenCols.includes(col.id)) return null;

    if (col.columnId === 'username') {
      return (
        <td key={col.columnId} style={{ fontWeight: 600 }}>
          <EditableCell
            value={profile.username}
            onSave={(val) => handleCellEdit(profile.id, 'username', val)}
          />
        </td>
      );
    }

    if (col.columnId === 'link') {
      return (
        <td key={col.columnId}>
          {profile.sourceUrl ? (
            <a
              href={profile.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="action-btn btn-outline"
              style={{ textDecoration: 'none', gap: 4, padding: '4px 8px' }}
            >
              <ExternalLinkIcon /> View
            </a>
          ) : '-'}
        </td>
      );
    }

    // Treat everything else as standard editable cells (so Nation can also be modified)
    return (
      <td key={col.columnId} {...dragProps(index, col.columnId, profile[col.columnId])}>
        <EditableCell
          value={profile[col.columnId] || ''}
          onSave={(val) => handleCellEdit(profile.id, col.columnId, val)}
        />
      </td>
    );
  };

  // Add a manual refresh function to break the cache if needed
  const forceRefreshData = () => {
    globalProfilesCache = null;
    globalColumnsCache = null;
    globalLastFetchTime = 0;
    fetchData();
  };

  // Calculate dynamic colspan based on actual columns present for a user
  const totalColSpan = customColumns.filter(c => !hiddenCols.includes(c.columnId)).length + 1; // +1 for Actions

  return (
    <div
      className="dashboard-container relative w-full flex flex-col"
      onMouseUp={dragFill.handleGlobalMouseUp}
    >
      <div
        className="dashboard-toolbar glass-panel flex-shrink-0"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          marginBottom: '16px',
          gap: '16px',
          flexWrap: 'wrap',
          zIndex: 20
        }}
      >
        <div className="search-bar-container" style={{ margin: 0, flex: 1, minWidth: '250px' }}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          <button onClick={forceRefreshData} className="action-btn" style={{ padding: '8px 12px' }}>
            Refresh Data
          </button>
          
          <button onClick={handleCopyAll} className="action-btn copy-btn" style={{ padding: '8px 12px' }}>
            <CopyIcon /> Copy All Usernames
          </button>

          <button onClick={handleDeleteAll} disabled={deleting} className="action-btn delete-btn" style={{ padding: '8px 12px' }}>
            <TrashIcon /> {deleting ? "Deleting..." : "Delete All"}
          </button>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--glass-border-strong)', margin: '0 4px' }}></div>

          <button className="add-category-btn" onClick={() => navigate('/staging')} style={{ padding: '8px 12px' }}>
            <LayersIcon /> Inbox / Staging
          </button>

          <button className="add-category-btn" onClick={() => setIsAddCategoryOpen(true)} style={{ padding: '8px 12px' }}>
            <PlusIcon /> Add Column
          </button>

          <button className="add-category-btn mass-upload-btn" onClick={() => setIsMassUploadOpen(true)} style={{ padding: '8px 12px' }}>
            <UploadCloudIcon /> Mass Upload
          </button>
        </div>
      </div>

      <ProfileChecker
        onProfileAdded={handleProfileAdded}
        customColumns={customColumns}
      />

      <div className="table-wrapper glass-panel flex-1" style={{ marginTop: 0 }}>
        <table className="profile-table w-full text-left">
          <thead>
            <tr>
              {/* Render dynamic columns directly from customColumns */}
              {customColumns.map(col =>
                renderHeader(col.displayName, col.columnId, col.isCustom)
              )}

              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredAndSortedProfiles.length === 0 ? (
              <tr>
                <td colSpan={totalColSpan} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                  {fetching ? 'Loading...' : (searchQuery ? 'No profiles match your search.' : 'No profiles yet.')}
                </td>
              </tr>
            ) : (
              filteredAndSortedProfiles.map((profile, index) => (
                <tr key={profile.id}>
                  
                  {/* Iterate over ALL custom columns. For core/base columns (isCustom: false), render natively. For custom columns, read from customCategories object */}
                  {customColumns.map(col => {
                    if (hiddenCols.includes(col.columnId)) return null;

                    if (!col.isCustom) {
                       return renderCoreCell(col, profile, index);
                    }

                    const customValue = profile.customCategories?.[col.columnId] || '';
                    return (
                      <td key={col.columnId} {...dragProps(index, col.columnId, customValue)}>
                        <EditableCell
                          type={col.inputType === 'dropdown' ? 'select' : 'text'}
                          options={col.options || []}
                          value={customValue}
                          onSave={(val) => handleCellEdit(profile.id, col.columnId, val, true)}
                        />
                      </td>
                    );
                  })}

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button className="action-btn copy-btn" onClick={() => handleCopyRow(profile)}>
                        <CopyIcon /> Copy
                      </button>
                      <button className="action-btn delete-btn" onClick={() => handleDeleteRow(profile.id)}>
                        <TrashIcon /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 2000 }}
        >
          <div className="context-menu-title">Column: {contextMenu.colName}</div>

          {contextMenu.isCustom ? (
            <>
              <button
                onClick={() => {
                  setSelectedColumn(customColumns.find(c => c.columnId === contextMenu.colId));
                  setIsManageColOpen(true);
                  setContextMenu(null);
                }}
              >
                ✎ Edit / Manage
              </button>

              <button
                className="danger"
                onClick={() => {
                  if (window.confirm(`Delete ${contextMenu.colName}?`)) {
                    handleDeleteCategory({ columnId: contextMenu.colId });
                  }
                  setContextMenu(null);
                }}
              >
                🗑 Delete Column
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  const newName = window.prompt("Rename Column:", contextMenu.colName);
                  if (newName && newName.trim()) {
                    setRenamedCols(prev => ({ ...prev, [contextMenu.colId]: newName.trim() }));
                  }
                  setContextMenu(null);
                }}
              >
                ✎ Edit Name
              </button>

              <button
                className="danger"
                onClick={() => {
                  if (window.confirm(`Hide ${contextMenu.colName}?`)) {
                    setHiddenCols(prev => Array.from(new Set([...prev, contextMenu.colId])));
                  }
                  setContextMenu(null);
                }}
              >
                🗑 Hide Column
              </button>
            </>
          )}
        </div>
      )}

      <DragFillOverlay
        visible={dragFill.isVisible}
        value={dragFill.value}
        count={dragFill.count}
      />

      <AverageViewsModal
        isOpen={isAvgCalcOpen}
        onClose={() => setIsAvgCalcOpen(false)}
        profileId={selectedProfileId}
        onSave={handleSaveAverage}
      />

      <CustomCategoryBuilder
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onSave={handleSaveNewCategory}
      />

      <ManageCategoryModal
        isOpen={isManageColOpen}
        onClose={() => setIsManageColOpen(false)}
        column={selectedColumn}
        onDelete={handleDeleteCategory}
      />

      <MassUploadModal
        isOpen={isMassUploadOpen}
        onClose={() => setIsMassUploadOpen(false)}
        onUploadComplete={(newProfiles) => setProfiles(prev => [...newProfiles, ...prev])}
      />
    </div>
  );
}