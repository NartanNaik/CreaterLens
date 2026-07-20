import { db, FieldValue } from "../config/firebase.js";

const collection = db.collection("usernames");

export const checkUsername = async (username) => {
  const normalizedUsername = username.trim().toLowerCase();

  const snapshot = await collection
    .where("normalizedUsername", "==", normalizedUsername)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];

    return {
      exists: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    };
  }

  return {
    exists: false,
    username: username.trim()
  };
};

export const addUsername = async (
  username,
  category,
  addedBy
) => {
  const originalUsername = username.trim();
  const normalizedUsername = originalUsername.toLowerCase();

  const snapshot = await collection
    .where("normalizedUsername", "==", normalizedUsername)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    throw new Error(
      `Username already exists in "${snapshot.docs[0].data().category || "Unknown"}".`
    );
  }

  const data = {
    username: originalUsername,
    normalizedUsername,
    category,
    nation: "",
    messages: 0,
    replies: 0,
    mentions: 0,
    reactions: 0,
    interestRate: 0,
    status: "Available",
    notes: "",
    addedBy,
    createdAt: FieldValue.serverTimestamp()
  };

  const docRef = await collection.add(data);

  return {
    id: docRef.id,
    ...data
  };
};

export const getUsernames = async (category) => {
  let query = collection;

  if (category && category !== "All") {
    query = query.where("category", "==", category);
  }

  const snapshot = await query.get();

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));

  data.sort((a, b) =>
    (a.username || "").localeCompare(
      b.username || ""
    )
  );

  return data;
};

export const massUploadUsernames = async (
  text,
  category,
  addedBy
) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const unique = [...new Set(lines)];

  let added = 0;
  let skipped = 0;

  for (const username of unique) {
    const normalizedUsername =
      username.toLowerCase();

    const snapshot = await collection
      .where(
        "normalizedUsername",
        "==",
        normalizedUsername
      )
      .limit(1)
      .get();

    if (!snapshot.empty) {
      skipped++;
      continue;
    }

    await collection.add({
      username,
      normalizedUsername,
      category,
      nation: "",
      messages: 0,
      replies: 0,
      mentions: 0,
      reactions: 0,
      interestRate: 0,
      status: "Available",
      notes: "",
      addedBy,
      createdAt: FieldValue.serverTimestamp()
    });

    added++;
  }

  return {
    total: unique.length,
    added,
    skipped
  };
};

export const deleteUsername = async (id) => {
  const docRef = collection.doc(id);

  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error("Username not found.");
  }

  await docRef.delete();

  return {
    success: true
  };
};

export const deleteAllUsernames = async (category) => {
  let query = collection;

  if (category && category !== "All") {
    query = query.where("category", "==", category);
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    return { deleted: 0 };
  }

  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  return { deleted: snapshot.size };
};

export const updateNation = async (id, nation) => {
  let safeNation = String(nation).trim();
  if (safeNation === "undefined") safeNation = "";

  await collection.doc(id).update({
    nation: safeNation
  });

  return { success: true };
};

export const updateInterest = async (id, data) => {
  const updatePayload = {};

  // 1. If the modal sends the raw counts, capture them safely
  if (data.messages !== undefined) updatePayload.messages = Number(data.messages) || 0;
  if (data.replies !== undefined) updatePayload.replies = Number(data.replies) || 0;
  if (data.mentions !== undefined) updatePayload.mentions = Number(data.mentions) || 0;
  if (data.reactions !== undefined) updatePayload.reactions = Number(data.reactions) || 0;

  // 2. If they sent at least one count, calculate the interest rate mathematically
  if (
    data.messages !== undefined || 
    data.replies !== undefined || 
    data.mentions !== undefined || 
    data.reactions !== undefined
  ) {
    const m = updatePayload.messages || 0;
    const r = updatePayload.replies || 0;
    const me = updatePayload.mentions || 0;
    const re = updatePayload.reactions || 0;
    
    updatePayload.interestRate = Number(
      (m * 0.4 + r * 0.3 + me * 0.2 + re * 0.1).toFixed(2)
    );
  } 
  // 3. If the modal ONLY sent the final calculated interestRate directly, trust it
  else if (data.interestRate !== undefined) {
    updatePayload.interestRate = Number(data.interestRate) || 0;
  }

  // Fallback if data was sent completely malformed as a raw number
  if (Object.keys(updatePayload).length === 0 && typeof data !== 'object') {
     updatePayload.interestRate = Number(data) || 0;
  }

  // Write the dynamically built payload to Firestore
  await collection.doc(id).update(updatePayload);
  return { success: true };
};

export const updateStatus = async (id, status) => {
  await collection.doc(id).update({ status });
  return { success: true };
};

export const updateNotes = async (id, notes) => {
  await collection.doc(id).update({ notes });
  return { success: true };
};

export const bulkUpdateAttribute = async (
  ids,
  attribute,
  values
) => {
  const batch = db.batch();

  ids.forEach((id, index) => {
    let value = values[index];

    if (attribute === "nation") {
      value = String(value).trim();
      if (value === "undefined") value = "";
    }

    if (attribute === "interestRate") {
      value = Number(value) || 0;
    }

    if (attribute === "status") {
      value = String(value).trim();
    }

    if (attribute === "notes") {
      value = String(value).trim();
    }

    batch.update(collection.doc(id), {
      [attribute]: value
    });
  });

  await batch.commit();

  return {
    updated: ids.length
  };
};

export const dragFillNation = async (ids, nation) => {
  const batch = db.batch();
  let safeNation = String(nation).trim();
  if (safeNation === "undefined") safeNation = "";

  ids.forEach((id) => {
    batch.update(collection.doc(id), {
      nation: safeNation
    });
  });

  await batch.commit();
  return { updated: ids.length };
};