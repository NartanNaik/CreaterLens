import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const settingsDoc = db.collection('settings').doc('global');

/**
 * Fetch all custom columns
 */
export const getCustomColumns = async () => {
    const doc = await settingsDoc.get();
    if (!doc.exists) {
        return [];
    }
    return doc.data().customColumns || [];
};

/**
 * Add a new custom column
 */
export const addCustomColumn = async (columnData) => {
    // 1. Create a safe, strictly alphanumeric database key
    const columnId = columnData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') // Replace any non-alphanumeric char with underscore
        .replace(/_+/g, '_')        // Collapse multiple underscores into one
        .replace(/^_|_$/g, '');     // Trim leading/trailing underscores

    if (!columnId) {
        throw new Error("Column name must contain valid letters or numbers.");
    }

    // 2. Prevent duplicate columns by checking existing ones
    const currentColumns = await getCustomColumns();
    const isDuplicate = currentColumns.some(col => col.columnId === columnId);
    
    if (isDuplicate) {
        throw new Error("A column with a similar name already exists.");
    }

    const newColumn = {
        columnId,
        displayName: columnData.name,
        inputType: columnData.inputType, // 'text' or 'dropdown'
        options: columnData.options || []
    };

    // 3. Safely append to the array
    await settingsDoc.set({
        customColumns: FieldValue.arrayUnion(newColumn)
    }, { merge: true });

    return newColumn;
};

/**
 * Delete a custom column safely by ID
 */
export const deleteCustomColumn = async ({ columnId }) => {
    // Firestore arrayRemove requires an EXACT object match to work.
    // Since we only pass the columnId, we use a Transaction to safely filter it out 
    // without risking race conditions if multiple users edit settings at once.
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(settingsDoc);
        
        if (!doc.exists) return; // Nothing to do

        const currentColumns = doc.data().customColumns || [];
        
        // Filter out the target column
        const updatedColumns = currentColumns.filter(col => col.columnId !== columnId);

        // Save the cleaned array back to the document
        transaction.update(settingsDoc, { customColumns: updatedColumns });
    });

    return { success: true };
};