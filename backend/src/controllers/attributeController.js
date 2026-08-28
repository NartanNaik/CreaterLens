import { db } from "../config/firebase.js";
import { calculateInterestRate } from "../services/interestService.js";

// Pointing to active profiles collection to unify the schema
const collection = db.collection("profiles");

// Helper function to commit large batch operations safely (Firestore limit is 500 ops)
const commitInBatches = async (operations) => {
  const BATCH_SIZE = 450;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = operations.slice(i, i + BATCH_SIZE);
    chunk.forEach((op) => op(batch));
    await batch.commit();
  }
};

export const updateNationController = async (req, res) => {
  try {
    const { id } = req.params;
    const { nation } = req.body;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required."
      });
    }

    if (!nation || typeof nation !== "string" || !nation.trim()) {
      return res.status(400).json({
        success: false,
        message: "Valid nation string is required."
      });
    }

    await collection.doc(id).update({
      nation: nation.trim()
    });

    return res.status(200).json({
      success: true,
      message: "Nation updated successfully."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const dragFillNationController = async (req, res) => {
  try {
    const { ids, nation } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A non-empty array of IDs is required."
      });
    }

    if (!nation || typeof nation !== "string" || !nation.trim()) {
      return res.status(400).json({
        success: false,
        message: "Valid nation string is required."
      });
    }

    const trimmedNation = nation.trim();
    const operations = ids
      .filter((id) => id && typeof id === "string")
      .map((id) => (batch) => {
        batch.update(collection.doc(id), { nation: trimmedNation });
      });

    await commitInBatches(operations);

    return res.status(200).json({
      success: true,
      message: "Nation copied successfully."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateInterestController = async (req, res) => {
  try {
    const { id } = req.params;
    const { messages = 0, replies = 0, mentions = 0, reactions = 0 } = req.body;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required."
      });
    }

    // Edge case: Force non-negative numbers for engagement metrics
    const safePayload = {
      messages: Math.max(0, Number(messages) || 0),
      replies: Math.max(0, Number(replies) || 0),
      mentions: Math.max(0, Number(mentions) || 0),
      reactions: Math.max(0, Number(reactions) || 0)
    };

    const interest = calculateInterestRate(safePayload);

    await collection.doc(id).update({
      ...safePayload,
      ...interest
    });

    return res.status(200).json({
      success: true,
      message: "Interest updated successfully.",
      data: interest
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required."
      });
    }

    if (status === undefined || status === null) {
      return res.status(400).json({
        success: false,
        message: "Status value is required."
      });
    }

    await collection.doc(id).update({
      status: String(status).trim()
    });

    return res.status(200).json({
      success: true,
      message: "Status updated successfully."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateNotesController = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Profile ID is required."
      });
    }

    await collection.doc(id).update({
      notes: typeof notes === "string" ? notes.trim() : ""
    });

    return res.status(200).json({
      success: true,
      message: "Notes updated successfully."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const bulkUpdateAttributeController = async (req, res) => {
  try {
    const { ids, values, attribute } = req.body;

    if (
      !Array.isArray(ids) ||
      !Array.isArray(values) ||
      ids.length !== values.length ||
      ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid bulk data. 'ids' and 'values' must be non-empty matching arrays."
      });
    }

    if (!attribute || typeof attribute !== "string" || !attribute.trim()) {
      return res.status(400).json({
        success: false,
        message: "Attribute name is required."
      });
    }

    const safeAttribute = attribute.trim();
    const operations = ids
      .filter((id) => id && typeof id === "string")
      .map((id, index) => (batch) => {
        let val = values[index];
        if (typeof val === "string") val = val.trim();
        batch.update(collection.doc(id), {
          [safeAttribute]: val
        });
      });

    await commitInBatches(operations);

    return res.status(200).json({
      success: true,
      message: "Bulk update completed."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};