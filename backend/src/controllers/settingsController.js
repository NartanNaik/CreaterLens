import * as settingsService from '../services/settingsService.js';

export const getColumns = async (req, res) => {
    try {
        const columns = await settingsService.getCustomColumns();
        res.status(200).json(columns);
    } catch (error) {
        console.error("Error fetching columns:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

export const addColumn = async (req, res) => {
    try {
        const { name, inputType, options } = req.body;
        if (!name || !inputType) {
            return res.status(400).json({ error: "Name and inputType are required." });
        }

        const newColumn = await settingsService.addCustomColumn({ name, inputType, options });
        res.status(201).json({ message: "Column added", column: newColumn });
    } catch (error) {
        console.error("Error adding column:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

export const deleteColumn = async (req, res) => {
    try {
        await settingsService.deleteCustomColumn(req.body);
        res.status(200).json({ message: "Column deleted successfully." });
    } catch (error) {
        console.error("Error deleting column:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};