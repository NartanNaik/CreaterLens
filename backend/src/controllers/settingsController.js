import * as settingsService from '../services/settingsService.js';

const MAX_NAME_LENGTH = 50;
const MAX_OPTIONS = 100;
const MAX_OPTION_LENGTH = 100;

// Names that would collide with built-in columns / document fields
const RESERVED_KEYS = [
    'id', 'username', 'link', 'contact', 'nation', 'skintone', 'bodytype', 'reeltype',
    'specialpart', 'agerange', 'playable', 'totalfollowers', 'avgviewsperweek', 'avgviews',
    'avglikes', 'avgcomments', 'status', 'notes', 'createdat', 'updatedat',
    'customcategories', 'actions'
];

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

    if (RESERVED_KEYS.includes(normalizeKey(name))) {
        return { error: `"${name}" is a built-in column name. Please choose another.`, conflict: true };
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

// Maps errors thrown by the service layer to proper HTTP statuses.
// Anything unrecognised is a genuine 500, logged with its stack.
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
        const columns = await settingsService.getCustomColumns();

        noCache(res);
        return res.status(200).json({
            success: true,
            data: Array.isArray(columns) ? columns : []
        });
    } catch (error) {
        /*
          TEMPORARY SAFETY NET for the 500 on GET /api/settings/columns.
          The most likely cause is that the settings/global document doesn't exist yet and
          the service reads `.customColumns` off an undefined snapshot. If so, there are
          simply no custom columns, so return an empty list instead of failing the whole
          dashboard. This is logged loudly so it isn't forgotten; the real fix belongs in
          settingsService.getCustomColumns (return [] when the doc doesn't exist).
        */
        if (error instanceof TypeError && /customColumns/.test(error.message || '')) {
            console.warn('settings/global is missing or malformed; returning no custom columns.', error.stack);
            noCache(res);
            return res.status(200).json({ success: true, data: [] });
        }

        return handleError(res, error, 'fetching columns');
    }
};

export const addColumn = async (req, res) => {
    try {
        const body = req.body || {};
        // Accept displayName as an alias, since the frontend/table uses that name
        const { inputType, options } = body;
        const rawName = body.name !== undefined ? body.name : body.displayName;

        const nameCheck = validateName(rawName);
        if (nameCheck.error) {
            return res.status(nameCheck.conflict ? 409 : 400).json({ success: false, error: nameCheck.error });
        }

        if (!inputType || typeof inputType !== 'string' || !inputType.trim()) {
            return res.status(400).json({
                success: false,
                error: "A valid inputType ('text' or 'dropdown') is required."
            });
        }

        const cleanInputType = inputType.trim().toLowerCase();

        if (!['text', 'dropdown'].includes(cleanInputType)) {
            return res.status(400).json({
                success: false,
                error: "Invalid inputType. Allowed values are 'text' or 'dropdown'."
            });
        }

        let cleanOptions = [];
        if (cleanInputType === 'dropdown') {
            if (!Array.isArray(options) || options.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Dropdown columns require an 'options' array with at least one item."
                });
            }

            const optionsCheck = cleanOptionsList(options);
            if (optionsCheck.error) {
                return res.status(400).json({ success: false, error: optionsCheck.error });
            }
            if (optionsCheck.value.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Dropdown options must contain valid text.'
                });
            }
            cleanOptions = optionsCheck.value;
        }

        const newColumn = await settingsService.addCustomColumn({
            name: nameCheck.value,
            inputType: cleanInputType,
            options: cleanOptions
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
        const body = req.body || {};
        const { columnId, options } = body;
        const rawName = body.name !== undefined ? body.name : body.displayName;

        if (!columnId || typeof columnId !== 'string' || !columnId.trim()) {
            return res.status(400).json({
                success: false,
                error: 'A valid columnId is required for updating.'
            });
        }

        const updateData = {};

        if (rawName !== undefined && rawName !== null && rawName !== '') {
            const nameCheck = validateName(rawName);
            if (nameCheck.error) {
                return res.status(nameCheck.conflict ? 409 : 400).json({ success: false, error: nameCheck.error });
            }
            updateData.name = nameCheck.value;
        }

        // An empty array means "no change"; a non-empty array must contain valid options
        if (Array.isArray(options) && options.length > 0) {
            const optionsCheck = cleanOptionsList(options);
            if (optionsCheck.error) {
                return res.status(400).json({ success: false, error: optionsCheck.error });
            }
            if (optionsCheck.value.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Options must contain at least one valid item.'
                });
            }
            updateData.options = optionsCheck.value;
        }

        // Previously this still hit the database with an empty update
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nothing to update. Provide a new name and/or options.'
            });
        }

        const updatedColumn = await settingsService.updateCustomColumn(columnId.trim(), updateData);

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
        const { columnId } = req.body || {};

        if (!columnId || typeof columnId !== 'string' || !columnId.trim()) {
            return res.status(400).json({
                success: false,
                error: 'A valid columnId is required for deletion.'
            });
        }

        await settingsService.deleteCustomColumn({ columnId: columnId.trim() });

        return res.status(200).json({
            success: true,
            message: 'Column deleted successfully.'
        });
    } catch (error) {
        return handleError(res, error, 'deleting column');
    }
};