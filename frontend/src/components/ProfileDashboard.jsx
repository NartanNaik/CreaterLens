import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
import { withCoreColumns, isCoreColumn, readStorage } from '../utils/tableColumns';

// --- Clean SVG Icons ---
const SearchIcon = () => (
  <svg className="svg-icon search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const RefreshIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);
const CopyIcon = () => (
  <svg className="svg-icon icon-mr-6" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);
const TrashIcon = () => (
  <svg className="svg-icon icon-mr-6" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);
const SettingsIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);
const LayersIcon = () => (
  <svg className="svg-icon icon-mr-6" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);
const PlusIcon = () => (
  <svg className="svg-icon icon-mr-6" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const CloudUploadIcon = () => (
  <svg className="svg-icon icon-mr-6" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
    <polyline points="16 16 12 12 8 16"></polyline>
    <line x1="12" y1="12" x2="12" y2="21"></line>
  </svg>
);
const ExternalLinkIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
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

const BATCH_SIZE = 10;

let globalProfilesCache = null;
let globalColumnsCache = null;
let globalLastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000;

// Resolves to the response body; throws an Error carrying the server's message.
const request = async (path, { method = 'GET', data } = {}) => {
  try {
    const res = await api.request({ url: path, method, data });
    return res.data;
  } catch (error) {
    const message = error.response?.data?.error || error.message || 'Request failed';
    throw new Error(message);
  }
};

const toArray = (body) => (Array.isArray(body) ? body : (body?.data || []));

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
  ta.className = 'clipboard-proxy';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (!ok) throw new Error('copy failed');
};

export default function ProfileDashboard() {
  const navigate = useNavigate();
  const { updateGlobalCount } = useOutletContext() || {};

  const [profiles, setProfiles] = useState(globalProfilesCache || []);
  const [customColumns, setCustomColumns] = useState(globalColumnsCache || []);
  const [fetching, setFetching] = useState(!globalProfilesCache);
  const [loaded, setLoaded] = useState(Boolean(globalProfilesCache));
  const [deleting, setDeleting] = useState(false);

  const [isAvgCalcOpen, setIsAvgCalcOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [selectedProfileId] = useState(null);

  const [isManageColOpen, setIsManageColOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);

  const [isMassUploadOpen, setIsMassUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [hiddenCols, setHiddenCols] = useState(() => readStorage('hiddenCols', []));
  const [renamedCols, setRenamedCols] = useState(() => readStorage('renamedCols', {}));

  useEffect(() => {
    if (profiles !== globalProfilesCache) {
      globalProfilesCache = profiles;
    }
  }, [profiles]);

  // Only push the count once real data has loaded, so an empty initial state never overwrites the header count.
  useEffect(() => {
    if (updateGlobalCount && loaded) {
      updateGlobalCount(profiles.length);
    }
  }, [profiles, loaded, updateGlobalCount]);

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
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    const now = Date.now();
    if (globalProfilesCache && globalColumnsCache && (now - globalLastFetchTime < CACHE_DURATION_MS)) {
      return;
    }

    setFetching(true);

    // allSettled: a failing /settings/columns must not blank the whole table.
    const [profilesRes, columnsRes] = await Promise.allSettled([
      request('/profiles'),
      request('/settings/columns')
    ]);

    let bothOk = true;

    if (profilesRes.status === 'fulfilled') {
      const fetchedProfiles = toArray(profilesRes.value);
      globalProfilesCache = fetchedProfiles;
      setProfiles(fetchedProfiles);
      setLoaded(true);
    } else {
      bothOk = false;
      console.error("Error fetching profiles:", profilesRes.reason);
      toast.error(profilesRes.reason?.message || "Failed to load profiles.");
    }

    if (columnsRes.status === 'fulfilled') {
      const fetchedColumns = toArray(columnsRes.value);
      globalColumnsCache = fetchedColumns;
      setCustomColumns(fetchedColumns);
    } else {
      bothOk = false;
      console.error("Error fetching columns:", columnsRes.reason);
      toast.error("Couldn't load custom columns. Showing defaults.");
    }

    globalLastFetchTime = bothOk ? Date.now() : 0;
    setFetching(false);
  };

  const forceRefreshData = () => {
    globalProfilesCache = null;
    globalColumnsCache = null;
    globalLastFetchTime = 0;
    fetchData();
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
        data: { avgViewsPerWeek: newAverage }
      });
    } catch (error) {
      console.error("Failed to save avg views:", error);
      toast.error("Failed to save average views.");
      if (previous) setProfiles(prev => prev.map(p => p.id === id ? { ...p, avgViewsPerWeek: previous.avgViewsPerWeek } : p));
    }
  };

  const handleSaveNewCategory = async (categoryData) => {
    try {
      const result = await request('/settings/columns', {
        method: 'POST',
        data: categoryData
      });
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
        data: columnToDelete
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
      if (removed) setProfiles(prev => [removed, ...prev]);
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
      await request(`/profiles/${profileId}`, { method: 'PATCH', data: payload });
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
      return request(`/profiles/${profile.id}`, { method: 'PATCH', data: payload });
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

  // Username + Link are force-prepended; core columns can never be hidden.
  const visibleColumns = useMemo(
    () => withCoreColumns(customColumns).filter(col => isCoreColumn(col.columnId) || !hiddenCols.includes(col.columnId)),
    [customColumns, hiddenCols]
  );

  const hiddenCount = hiddenCols.filter(id => !isCoreColumn(id)).length;

  const renderHeader = (col) => {
    const key = col.columnId;
    const displayLabel = renamedCols[key] || col.displayName;

    return (
      <th
        key={key}
        onClick={() => handleSort(key)}
        onContextMenu={(e) => handleContextMenu(e, key, displayLabel, col.isCustom)}
        className="sortable-header"
      >
        {displayLabel}
        {sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ↑' : ' ↓') : ''}
      </th>
    );
  };

  const renderCoreCell = (col, profile, index) => {
    if (col.columnId === 'username') {
      return (
        <td key={col.columnId} className="td-strong">
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
              className="action-btn link-btn"
            >
              <ExternalLinkIcon /> View
            </a>
          ) : '-'}
        </td>
      );
    }

    return (
      <td key={col.columnId} {...dragProps(index, col.columnId, profile[col.columnId])}>
        <EditableCell
          value={profile[col.columnId] || ''}
          onSave={(val) => handleCellEdit(profile.id, col.columnId, val)}
        />
      </td>
    );
  };

  const totalColSpan = visibleColumns.length + 1;

  return (
    <div
      className="dashboard-container"
      onMouseUp={dragFill.handleGlobalMouseUp}
    >
      <div className="dashboard-toolbar glass-panel">
        <div className="search-bar-container toolbar-search toolbar-search-wide">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="toolbar-actions">
          <button onClick={forceRefreshData} className="action-btn">
            <RefreshIcon /> Refresh Data
          </button>

          <button onClick={handleCopyAll} className="action-btn">
            <CopyIcon /> Copy All Usernames
          </button>

          <button onClick={handleDeleteAll} disabled={deleting} className="action-btn btn-danger">
            <TrashIcon /> {deleting ? "Deleting..." : "Delete All"}
          </button>

          <div className="toolbar-divider"></div>

          <div className="dropdown-container" ref={dropdownRef}>
            <button className="action-btn" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <SettingsIcon /> Actions
            </button>

            <div className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
              <button className="dropdown-item" onClick={() => { navigate('/staging'); setIsDropdownOpen(false); }}>
                <LayersIcon /> Inbox / Staging
              </button>
              <button className="dropdown-item" onClick={() => { setIsAddCategoryOpen(true); setIsDropdownOpen(false); }}>
                <PlusIcon /> Add Column
              </button>
              <button className="dropdown-item" onClick={() => { setIsMassUploadOpen(true); setIsDropdownOpen(false); }}>
                <CloudUploadIcon /> Mass Upload
              </button>
              <button className="dropdown-item" onClick={() => { handleCopyAll(); setIsDropdownOpen(false); }}>
                <CopyIcon /> Copy All Usernames
              </button>
              <button className="dropdown-item danger" disabled={deleting} onClick={() => { setIsDropdownOpen(false); handleDeleteAll(); }}>
                <TrashIcon /> {deleting ? "Deleting..." : "Delete All"}
              </button>
              {hiddenCount > 0 && (
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setHiddenCols(prev => prev.filter(isCoreColumn));
                    setIsDropdownOpen(false);
                  }}
                >
                  <EyeOffIcon /> Show Hidden Columns ({hiddenCount})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="checker-wrapper">
        <ProfileChecker
          onProfileAdded={handleProfileAdded}
          customColumns={customColumns}
        />
      </div>

      <div className="table-wrapper glass-panel">
        <table className="staging-table profile-table">
          <thead>
            <tr>
              {visibleColumns.map(renderHeader)}
              <th className="cell-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredAndSortedProfiles.length === 0 ? (
              <tr>
                <td colSpan={totalColSpan} className="table-empty-state">
                  {fetching ? 'Loading...' : (searchQuery ? 'No profiles match your search.' : 'No profiles yet.')}
                </td>
              </tr>
            ) : (
              filteredAndSortedProfiles.map((profile, index) => (
                <tr key={profile.id}>

                  {visibleColumns.map(col => {
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

                  <td className="cell-right">
                    <div className="table-action-group">
                      <button className="action-btn" onClick={() => handleCopyRow(profile)}>
                        <CopyIcon /> Copy
                      </button>
                      <button className="action-btn btn-danger" onClick={() => handleDeleteRow(profile.id)}>
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
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
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
                <EditIcon /> Edit / Manage
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
                <TrashIcon /> Delete Column
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
                <EditIcon /> Edit Name
              </button>

              {!isCoreColumn(contextMenu.colId) && (
                <button
                  className="danger"
                  onClick={() => {
                    if (window.confirm(`Hide ${contextMenu.colName}?`)) {
                      setHiddenCols(prev => Array.from(new Set([...prev, contextMenu.colId])));
                    }
                    setContextMenu(null);
                  }}
                >
                  <EyeOffIcon /> Hide Column
                </button>
              )}
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