import { db } from "../config/firebase.js";

const collection = db.collection("users");
const settingsCollection = db.collection("settings");

export const getUserSettings = async (userId) => {
  const docRef = collection.doc(userId);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    return {
      categories: [],
      visibleColumns: {
        username: true,
        nation: true,
        interestRate: true,
        createdAt: true,
        status: true,
        notes: true,
        addedBy: true,
        copy: true,
        delete: true
      }
    };
  }
  
  return doc.data();
};

export const updateUserSettings = async (userId, settings) => {
  const docRef = collection.doc(userId);
  await docRef.set(settings, { merge: true });
  return { success: true };
};

// ---- Global Categories (shared across all users) ----

export const getGlobalCategories = async () => {
  const docRef = settingsCollection.doc("global");
  const doc = await docRef.get();
  
  if (!doc.exists) {
    return { categories: [] };
  }
  
  return { categories: doc.data().categories || [] };
};

export const updateGlobalCategories = async (categories) => {
  const docRef = settingsCollection.doc("global");
  await docRef.set({ categories }, { merge: true });
  return { success: true };
};