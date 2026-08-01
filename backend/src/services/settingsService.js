import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const settingsDoc = db.collection('settings').doc('global');

/**
 * Fetch all custom columns
 */
export const getCustomColumns = async () => {
    const doc = await settingsDoc.get();
    if (!doc.exists) {
        // If it doesn't exist yet, return an empty array
        return [];
    }
    return doc.data().customColumns || [];
};

/**
 * Add a new custom column
 */
export const addCustomColumn = async (columnData) => {
    const newColumn = {
        columnId: columnData.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: columnData.name,
        inputType: columnData.inputType, // 'text' or 'dropdown'
        options: columnData.options || []
    };

    // Use FieldValue.arrayUnion to append the new column safely
    await settingsDoc.set({
        customColumns: FieldValue.arrayUnion(newColumn)
    }, { merge: true });

    return newColumn;
};

/**
 * Delete a custom column
 */
export const deleteCustomColumn = async (columnToRemove) => {
    await settingsDoc.set({
        customColumns: FieldValue.arrayRemove(columnToRemove)
    }, { merge: true });
    return { success: true };
};