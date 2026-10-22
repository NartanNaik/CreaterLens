// Shared helpers for the Staging Queue and Profile Dashboard tables.

export const CORE_COLUMNS = [
  { columnId: 'username', displayName: 'Username', isCustom: false },
  { columnId: 'link', displayName: 'Link', isCustom: false }
];

const CORE_IDS = CORE_COLUMNS.map((c) => c.columnId);

export const isCoreColumn = (columnId) => CORE_IDS.includes(columnId);

// Guarantees "Username" and "Link" are always the first two columns,
// even when the backend column list omits them (or the request failed).
// If the backend does return them, its displayName wins, but they are never duplicated.
export const withCoreColumns = (columns) => {
  const list = Array.isArray(columns) ? columns.filter(Boolean) : [];

  const core = CORE_COLUMNS.map((def) => {
    const found = list.find((c) => c.columnId === def.columnId);
    return { ...def, ...(found || {}), isCustom: false };
  });

  const rest = list.filter((c) => !isCoreColumn(c.columnId));
  return [...core, ...rest];
};

export const readStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
};

export const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Could not persist "${key}":`, e);
  }
};