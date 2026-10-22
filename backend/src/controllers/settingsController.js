import { db } from '../config/firebase.js';

const MAX_NAME_LENGTH = 50;
const MAX_OPTIONS = 100;
const MAX_OPTION_LENGTH = 100;

// Characters that break Firestore field paths (customCategories.<id>) or ids
const FORBIDDEN_NAME_CHARS = /[./\\[\]*~`]/;

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

// Maps errors thrown to proper HTTP statuses.
const handleError = (res, error, label) => {
    const message = typeof error?.message === 'string' ? error.message : '';

    if (/not found/i.test(message)) {
        return res.status(404).json({ success: false, error: 'Column not found.' });
    }
    if (/already exists|duplicate/i.test(message)) {
        return res.status(409).json({ success: false, error: 'A column with this name already exists.' });
    }

    console.error(`Error ${label}:`, error?.stack || error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
};

export const getColumns = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

        const settingsRef = db.collection('users_settings').doc(userId);
        const doc = await settingsRef.get();

        noCache(res);

        if (!doc.exists) {
            // Safety fallback: if somehow the user reached here without login setting up the doc
            return res.status(200).json({ success: true, data: [] });
        }

        const data = doc.data();
        return res.status(200).json({
            success: true,
            data: data.columns || []
        });
    } catch (error) {
        return handleError(res, error, 'fetching columns');
    }
};

export const addColumn = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

        const body = req.body || {};
        const { inputType, options } = body;
        const rawName = body.name !== undefined ? body.name : body.displayName;

        const nameCheck = validateName(rawName);
        if (nameCheck.error) {
            return res.status(nameCheck.conflict ? 409 : 400).json({ success: false, error: nameCheck.error });
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
            if (!doc.exists) {
                t.set(settingsRef, { userId, columns: [newColumn], createdAt: new Date().toISOString() });
            } else {
                const existingCols = doc.data().columns || [];
                if (existingCols.some(c => c.columnId === newColumn.columnId)) {
                    throw new Error('duplicate');
                }
                t.update(settingsRef, { columns: [...existingCols, newColumn] });
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
        if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

        const body = req.body || {};
        const { columnId, options } = body;
        const rawName = body.name !== undefined ? body.name : body.displayName;

        if (!columnId || typeof columnId !== 'string' || !columnId.trim()) {
            return res.status(400).json({ success: false, error: 'A valid columnId is required for updating.' });
        }

        const settingsRef = db.collection('users_settings').doc(userId);
        let updatedColumn = null;

        await db.runTransaction(async (t) => {
            const doc = await t.get(settingsRef);
            if (!doc.exists) throw new Error('not found');

            const columns = doc.data().columns || [];
            const colIndex = columns.findIndex(c => c.columnId === columnId);
            
            if (colIndex === -1) throw new Error('not found');
            
            // Prevent users from breaking core structural columns
            if (!columns[colIndex].isCustom && columnId !== "nation") {
                 throw new Error("Cannot edit core system columns.");
            }

            if (rawName) {
                const nameCheck = validateName(rawName);
                if (nameCheck.error) throw new Error(nameCheck.error);
                columns[colIndex].displayName = nameCheck.value;
            }

            if (Array.isArray(options) && options.length > 0) {
                const optionsCheck = cleanOptionsList(options);
                if (optionsCheck.error) throw new Error(optionsCheck.error);
                columns[colIndex].options = optionsCheck.value;
            }

            updatedColumn = columns[colIndex];
            t.update(settingsRef, { columns });
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
        if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

        const { columnId } = req.body || {};

        if (!columnId || typeof columnId !== 'string' || !columnId.trim()) {
            return res.status(400).json({ success: false, error: 'A valid columnId is required for deletion.' });
        }

        const settingsRef = db.collection('users_settings').doc(userId);

        await db.runTransaction(async (t) => {
            const doc = await t.get(settingsRef);
            if (!doc.exists) throw new Error('not found');

            const columns = doc.data().columns || [];
            const colIndex = columns.findIndex(c => c.columnId === columnId);
            
            if (colIndex === -1) throw new Error('not found');
            
            // Protect structural data
            if (!columns[colIndex].isCustom) {
                throw new Error("Cannot delete core system columns.");
            }

            columns.splice(colIndex, 1);
            t.update(settingsRef, { columns });
        });

        return res.status(200).json({
            success: true,
            message: 'Column deleted successfully.'
        });
    } catch (error) {
        return handleError(res, error, 'deleting column');
    }
};