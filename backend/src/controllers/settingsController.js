import { db } from '../config/firebase.js';

const MAX_NAME_LENGTH = 50;
const MAX_OPTIONS = 100;
const MAX_OPTION_LENGTH = 100;
const MAX_COLUMNS = 40;

// Characters that break Firestore field paths (customCategories.<id>) or ids
const FORBIDDEN_NAME_CHARS = /[./\\[\]*~`]/;

// Same defaults authController creates for new users
const DEFAULT_COLUMNS = [
    { columnId: 'username', displayName: 'Username', inputType: 'text', isCustom: false },
    { columnId: 'link', displayName: 'Link', inputType: 'text', isCustom: false },
    { columnId: 'nation', displayName: 'Nation', inputType: 'text', isCustom: true }
];

// Errors that carry the HTTP status they should produce
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const isQuotaError = (err) =>
    err?.code === 8 || /RESOURCE_EXHAUSTED/i.test(String(err?.message || ''));

const normalizeKey = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const noCache = (res) => res.set('Cache-Control', 'no-store');

// Validates a column display name. Returns { value } or { error }.
const validateName = (rawName) => {
    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
        return { error: 'A valid column name is required.' };
    }

    const name = rawName.trim();

    if (name.length > MAX_NAME_LENGTH) {
        return { error: `Column name must be ${MAX_NAME_LENGTH} characters or fewer.` };
    }

    if (FORBIDDEN_NAME_CHARS.test(name)) {
        return { error: 'Column name cannot contain . / \\ [ ] * ~ or backticks.' };
    }

    if (!normalizeKey(name)) {
        return { error: 'Column name must contain at least one letter or number.' };
    }

    return { value: name };
};

// Trims, removes blanks and duplicates. Returns { value } or { error }.
const cleanOptionsList = (options) => {
    const cleaned = [...new Set(
        options.map((opt) => (typeof opt === 'string' ? opt.trim() : '')).filter(Boolean)
    )];

    if (cleaned.length > MAX_OPTIONS) {
        return { error: `A dropdown can have at most ${MAX_OPTIONS} options.` };
    }

    if (cleaned.some((opt) => opt.length > MAX_OPTION_LENGTH)) {
        return { error: `Each option must be ${MAX_OPTION_LENGTH} characters or fewer.` };
    }

    return { value: cleaned };
};

// Maps thrown errors to proper HTTP statuses.
const handleError = (res, error, label) => {
    if (error instanceof HttpError) {
        return res.status(error.status).json({ success: false, error: error.message });
    }

    if (isQuotaError(error)) {
        console.error(`Quota exceeded while ${label}.`);
        return res.status(503).json({
            success: false,
            code: 'QUOTA_EXCEEDED',
            error: 'Database quota exceeded. Please try again later.'
        });
    }

    console.error(`Error ${label}:`, error?.stack || error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
};

const readColumns = (doc) =>
    doc.exists && Array.isArray(doc.data()?.columns) ? doc.data().columns : null;

export const getColumns = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        noCache(res);

        const doc = await db.collection('users_settings').doc(userId).get();

        // No settings doc yet: return the defaults without writing anything.
        // addColumn seeds the doc with these defaults when the user first adds a column.
        const columns = readColumns(doc) || DEFAULT_COLUMNS;

        return res.status(200).json({ success: true, data: columns });
    } catch (error) {
        return handleError(res, error, 'fetching columns');
    }
};

export const addColumn = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const body = req.body || {};
        const { inputType, options } = body;
        const rawName = body.name !== undefined ? body.name : body.displayName;

        const nameCheck = validateName(rawName);
        if (nameCheck.error) {
            return res.status(400).json({ success: false, error: nameCheck.error });
        }

        if (!inputType || typeof inputType !== 'string' || !inputType.trim()) {
            return res.status(400).json({ success: false, error: "A valid inputType ('text' or 'dropdown') is required." });
        }

        const cleanInputType = inputType.trim().toLowerCase();

        if (!['text', 'dropdown'].includes(cleanInputType)) {
            return res.status(400).json({ success: false, error: "Invalid inputType. Allowed values are 'text' or 'dropdown'." });
        }

        let cleanOptions = [];
        if (cleanInputType === 'dropdown') {
            if (!Array.isArray(options) || options.length === 0) {
                return res.status(400).json({ success: false, error: "Dropdown columns require an 'options' array with at least one item." });
            }

            const optionsCheck = cleanOptionsList(options);
            if (optionsCheck.error) return res.status(400).json({ success: false, error: optionsCheck.error });
            if (optionsCheck.value.length === 0) return res.status(400).json({ success: false, error: 'Dropdown options must contain valid text.' });

            cleanOptions = optionsCheck.value;
        }

        const settingsRef = db.collection('users_settings').doc(userId);

        const newColumn = {
            columnId: normalizeKey(nameCheck.value),
            displayName: nameCheck.value,
            inputType: cleanInputType,
            options: cleanOptions,
            isCustom: true // Marks that this can be deleted/edited by the user
        };

        await db.runTransaction(async (t) => {
            const doc = await t.get(settingsRef);
            const existing = readColumns(doc) || DEFAULT_COLUMNS;

            if (existing.some((c) => c.columnId === newColumn.columnId)) {
                throw new HttpError(409, 'A column with this name already exists.');
            }
            if (existing.length >= MAX_COLUMNS) {
                throw new HttpError(400, `You can have at most ${MAX_COLUMNS} columns.`);
            }

            const next = [...existing, newColumn];

            if (doc.exists) {
                t.update(settingsRef, { columns: next });
            } else {
                t.set(settingsRef, { userId, columns: next, createdAt: new Date().toISOString() });
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Column added successfully.',
            column: newColumn
        });
    } catch (error) {
        return handleError(res, error, 'adding column');
    }
};

export const updateColumn = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const body = req.body || {};
        const { columnId, options } = body;
        const rawName = body.name !== undefined ? body.name : body.displayName;

        if (!columnId || typeof columnId !== 'string' || !columnId.trim()) {
            return res.status(400).json({ success: false, error: 'A valid columnId is required for updating.' });
        }

        // Validate input before opening a transaction
        let newName = null;
        if (rawName !== undefined && rawName !== null && rawName !== '') {
            const nameCheck = validateName(rawName);
            if (nameCheck.error) return res.status(400).json({ success: false, error: nameCheck.error });
            newName = nameCheck.value;
        }

        let newOptions = null;
        if (options !== undefined) {
            if (!Array.isArray(options) || options.length === 0) {
                return res.status(400).json({ success: false, error: "'options' must be a non-empty array." });
            }
            const optionsCheck = cleanOptionsList(options);
            if (optionsCheck.error) return res.status(400).json({ success: false, error: optionsCheck.error });
            if (optionsCheck.value.length === 0) return res.status(400).json({ success: false, error: 'Dropdown options must contain valid text.' });
            newOptions = optionsCheck.value;
        }

        const settingsRef = db.collection('users_settings').doc(userId);
        let updatedColumn = null;

        await db.runTransaction(async (t) => {
            const doc = await t.get(settingsRef);
            const columns = readColumns(doc);
            if (!columns) throw new HttpError(404, 'Column not found.');

            const colIndex = columns.findIndex((c) => c.columnId === columnId);
            if (colIndex === -1) throw new HttpError(404, 'Column not found.');

            const current = columns[colIndex];

            // Core structural columns (Username, Link) cannot be edited. Nation stays editable.
            if (!current.isCustom && columnId !== 'nation') {
                throw new HttpError(403, 'Cannot edit core system columns.');
            }

            if (newOptions && current.inputType !== 'dropdown') {
                throw new HttpError(400, 'Only dropdown columns have options.');
            }

            updatedColumn = {
                ...current,
                ...(newName ? { displayName: newName } : {}),
                ...(newOptions ? { options: newOptions } : {})
            };

            const next = columns.map((c, i) => (i === colIndex ? updatedColumn : c));
            t.update(settingsRef, { columns: next });
        });

        return res.status(200).json({
            success: true,
            message: 'Column updated successfully.',
            column: updatedColumn
        });
    } catch (error) {
        return handleError(res, error, 'updating column');
    }
};

export const deleteColumn = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const { columnId } = req.body || {};

        if (!columnId || typeof columnId !== 'string' || !columnId.trim()) {
            return res.status(400).json({ success: false, error: 'A valid columnId is required for deletion.' });
        }

        const settingsRef = db.collection('users_settings').doc(userId);

        await db.runTransaction(async (t) => {
            const doc = await t.get(settingsRef);
            const columns = readColumns(doc);
            if (!columns) throw new HttpError(404, 'Column not found.');

            const colIndex = columns.findIndex((c) => c.columnId === columnId);
            if (colIndex === -1) throw new HttpError(404, 'Column not found.');

            // Protect structural data
            if (!columns[colIndex].isCustom) {
                throw new HttpError(403, 'Cannot delete core system columns.');
            }

            t.update(settingsRef, { columns: columns.filter((_, i) => i !== colIndex) });
        });

        return res.status(200).json({
            success: true,
            message: 'Column deleted successfully.'
        });
    } catch (error) {
        return handleError(res, error, 'deleting column');
    }
};