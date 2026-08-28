import * as settingsService from '../services/settingsService.js';

export const getColumns = async (req, res) => {
    try {
        const columns = await settingsService.getCustomColumns();
        return res.status(200).json({
            success: true,
            data: columns
        });
    } catch (error) {
        console.error("Error fetching columns:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
};

export const addColumn = async (req, res) => {
    try {
        const { name, inputType, options } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: "A valid column name is required."
            });
        }

        if (!inputType || typeof inputType !== "string" || !inputType.trim()) {
            return res.status(400).json({
                success: false,
                error: "A valid inputType ('text' or 'dropdown') is required."
            });
        }

        const cleanName = name.trim();
        const cleanInputType = inputType.trim().toLowerCase();

        if (!["text", "dropdown"].includes(cleanInputType)) {
            return res.status(400).json({
                success: false,
                error: "Invalid inputType. Allowed values are 'text' or 'dropdown'."
            });
        }

        let cleanOptions = [];
        if (cleanInputType === "dropdown") {
            if (!Array.isArray(options) || options.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Dropdown columns require an 'options' array with at least one item."
                });
            }
            // Sanitize options: remove empty strings, trim, and remove duplicates
            cleanOptions = [...new Set(options.map(opt => typeof opt === "string" ? opt.trim() : "").filter(Boolean))];
            
            if (cleanOptions.length === 0) {
                 return res.status(400).json({
                    success: false,
                    error: "Dropdown options must contain valid text."
                });
            }
        }

        const newColumn = await settingsService.addCustomColumn({ 
            name: cleanName, 
            inputType: cleanInputType, 
            options: cleanOptions 
        });

        return res.status(201).json({
            success: true,
            message: "Column added successfully.",
            column: newColumn
        });
    } catch (error) {
        console.error("Error adding column:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
};

export const deleteColumn = async (req, res) => {
    try {
        const { columnId } = req.body;

        if (!columnId || typeof columnId !== "string" || !columnId.trim()) {
            return res.status(400).json({
                success: false,
                error: "A valid columnId is required for deletion."
            });
        }

        // Pass a strict object to the service to prevent object injection
        await settingsService.deleteCustomColumn({ columnId: columnId.trim() });
        
        return res.status(200).json({
            success: true,
            message: "Column deleted successfully."
        });
    } catch (error) {
        console.error("Error deleting column:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
};