import React, { useState, useEffect, useMemo, useRef } from 'react';
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

// Core (system) columns, in display order. Headers and cells are both generated from this list.
const CORE_COLUMNS = [
  { id: 'username', label: 'Username', kind: 'username' },
  { id: 'link', label: 'Link', kind: 'link' },
  { id: 'contact', label: 'Contact', kind: 'text', fallback: '' },
  { id: 'nation', label: 'Nation', kind: 'text' },
  { id: 'skinTone', label: 'Skin Tone', kind: 'select', options: ['Fair', 'Tan', 'Dark'] },
  { id: 'bodyType', label: 'Body Type', kind: 'select', options: ['Fit', 'Slim', 'Fat', 'Curvy'] },
  { id: 'reelType', label: 'Reel Type', kind: 'select', options: ['Hot', 'Erotic', 'Beautiful'] },
  { id: 'specialPart', label: 'Special Part', kind: 'select', options: ['Whole body', 'Breast', 'Face', 'Stomach', 'Below stomach', 'Back'] },
  { id: 'ageRange', label: 'Age', kind: 'select', options: ['18 to 28', '29 to 35', '36+'] },
  { id: 'playable', label: 'Playable', kind: 'playable' },
  { id: 'totalFollowers', label: 'Followers', kind: 'number' },
  { id: 'avgViewsPerWeek', label: 'Avg Views', kind: 'avgViews' },
  { id: 'avgLikes', label: 'Avg Likes', kind: 'number', fallback: 0 },
  { id: 'avgComments', label: 'Avg Comments', kind: 'number', fallback: 0 }
];

const BATCH_SIZE = 10;

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

// Uses the shared axios instance so expired access tokens are refreshed automatically.
// (The old raw fetch() calls skipped the refresh logic, which is what produced the 403s.)
// Returns an object with .json() so the existing call sites keep working.
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
  // fallback for non-HTTPS contexts
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
  const { isVideoTheme } = useOutletContext() || { isVideoTheme: false };

  const [profiles, setProfiles] = useState([]);
  const [customColumns, setCustomColumns] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bgVideoCount, setBgVideoCount] = useState(5);

  const [isAvgCalcOpen, setIsAvgCalcOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const [isManageColOpen, setIsManageColOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);

  const [isMassUploadOpen, setIsMassUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const [contextMenu, setContextMenu] = useState(null);

  // Hidden/renamed Core System Columns (shared with the Staging page via localStorage)
  const [hiddenCols, setHiddenCols] = useState(() => readStorage('hiddenCols', []));
  const [renamedCols, setRenamedCols] = useState(() => readStorage('renamedCols', {}));

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
    fetchData();
  }, []);

  // Persist renamed/hidden state when changed
  useEffect(() => {
    try {
      localStorage.setItem('hiddenCols', JSON.stringify(hiddenCols));
      localStorage.setItem('renamedCols', JSON.stringify(renamedCols));
    } catch (e) {
      console.error('Could not persist column settings:', e);
    }
  }, [hiddenCols, renamedCols]);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [profilesRes, columnsRes] = await Promise.all([
        request('/profiles'),
        request('/settings/columns')
      ]);

      const profilesData = await profilesRes.json();
      const columnsData = await columnsRes.json();

      setProfiles(Array.isArray(profilesData) ? profilesData : (profilesData.data || []));
      setCustomColumns(Array.isArray(columnsData) ? columnsData : (columnsData.data || []));
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

    // Empty values always sort last, whichever direction is selected
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

    // Small batches so we don't fire hundreds of requests at once; track failures individually
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
      setProfiles(prev => [...failed, ...prev]); // put back what didn't actually delete
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
      setProfiles(prev => prev.map(p => p.id === profileId ? original : p)); // roll back
    }
  };

  /*
    FIX: drag-fill indices come from the rows as DISPLAYED (filtered + sorted), but this
    used to slice/map the raw `profiles` array, so with any search or sort active it
    filled the wrong rows. It now resolves the affected rows from the displayed list and
    updates by id. Dragging upward (start > end) is also handled.
  */
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

  // Helper for the repeated drag-fill handlers on editable cells
  const dragProps = (index, key, value) => ({
    onMouseDown: () => dragFill.handleMouseDown(index, key, value),
    onMouseEnter: () => dragFill.handleMouseEnter(index, key),
    onMouseUp: () => dragFill.handleMouseUp(index, key)
  });

  // NOTE: this is a plain render function, not a component. It used to be a component
  // defined inside ProfileDashboard, which React remounted on every render.
  // Sticky/background/border styling now comes from the stylesheet.
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

    switch (col.kind) {
      case 'username':
        return (
          <td key={col.id} style={{ fontWeight: 600 }}>
            <EditableCell
              value={profile.username}
              onSave={(val) => handleCellEdit(profile.id, 'username', val)}
            />
          </td>
        );

      case 'link':
        return (
          <td key={col.id}>
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

      case 'playable':
        return (
          <td
            key={col.id}
            onClick={() => handleCellEdit(profile.id, 'playable', !profile.playable)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <span className={`status-badge ${profile.playable ? 'available' : 'rejected'}`}>
              {profile.playable ? 'Yes' : 'No'}
            </span>
          </td>
        );

      case 'avgViews':
        return (
          <td
            key={col.id}
            style={{ color: 'var(--text-faint)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
            onClick={() => {
              setSelectedProfileId(profile.id);
              setIsAvgCalcOpen(true);
            }}
          >
            {profile.avgViewsPerWeek > 0 ? profile.avgViewsPerWeek.toLocaleString() : 'Calculate ➔'}
          </td>
        );

      case 'select':
        return (
          <td key={col.id} {...dragProps(index, col.id, profile[col.id])}>
            <EditableCell
              type="select"
              value={profile[col.id]}
              options={col.options}
              onSave={(val) => handleCellEdit(profile.id, col.id, val)}
            />
          </td>
        );

      case 'number':
        return (
          <td key={col.id} {...dragProps(index, col.id, profile[col.id])}>
            <EditableCell
              type="number"
              value={profile[col.id] ?? col.fallback}
              onSave={(val) => handleCellEdit(profile.id, col.id, Number(val))}
            />
          </td>
        );

      default: // text
        return (
          <td key={col.id} {...dragProps(index, col.id, profile[col.id])}>
            <EditableCell
              value={profile[col.id] ?? col.fallback}
              onSave={(val) => handleCellEdit(profile.id, col.id, val)}
            />
          </td>
        );
    }
  };

  // ---------- Video theme ----------
  // Instagram CDN video links expire, so stored URLs can't be trusted. When the theme is on we
  // ask the server for fresh links for the rows at the top of the current view, and only
  // play videos confirmed fresh this session.
  const [freshVideoIds, setFreshVideoIds] = useState(() => new Set());
  const requestedVideoIds = useRef(new Set());

  const videoCandidateIds = useMemo(
    () => filteredAndSortedProfiles
      .filter(p => p.sourceUrl)
      .slice(0, Math.min(12, bgVideoCount + 4))   // a few spares in case some have no video
      .map(p => p.id),
    [filteredAndSortedProfiles, bgVideoCount]
  );
  const videoCandidateKey = videoCandidateIds.join(',');

  useEffect(() => {
    if (!isVideoTheme || fetching) return;

    const toRefresh = videoCandidateIds.filter(id => !requestedVideoIds.current.has(id));
    if (toRefresh.length === 0) return;

    toRefresh.forEach(id => requestedVideoIds.current.add(id));

    (async () => {
      try {
        const { data } = await api.post('/profiles/refresh-videos', { ids: toRefresh });
        const good = (data.data || []).filter(r => r.videoPreviewUrl);
        if (good.length === 0) return;

        const byId = new Map(good.map(r => [r.id, r.videoPreviewUrl]));
        setProfiles(prev => prev.map(p => byId.has(p.id) ? { ...p, videoPreviewUrl: byId.get(p.id) } : p));
        setFreshVideoIds(prev => new Set([...prev, ...byId.keys()]));
      } catch (error) {
        console.error('Video refresh failed:', error);
        toRefresh.forEach(id => requestedVideoIds.current.delete(id));   // allow a retry later
      }
    })();
  }, [isVideoTheme, fetching, videoCandidateKey]);

  const bgVideos = useMemo(
    () => filteredAndSortedProfiles
      .filter(p => p.videoPreviewUrl && freshVideoIds.has(p.id))
      .slice(0, bgVideoCount),
    [filteredAndSortedProfiles, freshVideoIds, bgVideoCount]
  );

  const visibleCoreCount = CORE_COLUMNS.filter(c => !hiddenCols.includes(c.id)).length;
  const visibleCustomCount = customColumns.filter(c => !hiddenCols.includes(c.columnId)).length;
  const totalColSpan = visibleCoreCount + visibleCustomCount + 1;

  return (
    <div
      className="dashboard-container relative w-full flex flex-col"
      onMouseUp={dragFill.handleGlobalMouseUp}
    >

      {/* DYNAMIC VIDEO BACKGROUND (was a solid black box with the Instagram link as video src) */}
      {isVideoTheme && (
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

      {/* Top Action Toolbar */}
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
            placeholder="Search by username or nation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
            <PlusIcon /> Add Category
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

      {/* SCROLLABLE Table Wrapper (border/radius come from .glass-panel; the old
          var(--border-light) was never defined, which silently dropped the border) */}
      <div className="table-wrapper glass-panel flex-1" style={{ marginTop: 0 }}>
        <table className="profile-table w-full text-left">
          <thead>
            <tr>
              {CORE_COLUMNS.map(col =>
                renderHeader(col.label, col.id, false, col.kind !== 'link')
              )}

              {customColumns.map(col =>
                renderHeader(col.displayName, col.columnId, true)
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
                  {CORE_COLUMNS.map(col => renderCoreCell(col, profile, index))}

                  {customColumns.map(col => {
                    if (hiddenCols.includes(col.columnId)) return null;
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