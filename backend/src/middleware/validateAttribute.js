export const validateAttribute = (req, res, next) => {
  const { attribute } = req.body;

  // If the payload doesn't include an attribute, pass it to the controller to handle the error
  if (attribute === undefined) {
    return next();
  }

  // Prevent arrays or objects from crashing the string validation
  if (typeof attribute !== "string" || !attribute.trim()) {
    return res.status(400).json({
      success: false,
      message: "Attribute must be a valid text string."
    });
  }

  const safeAttribute = attribute.trim();

  // Core fields from your unified profiles schema
  const coreAttributes = [
    "nation",
    "skinTone",
    "bodyType",
    "reelType",
    "specialPart",
    "ageRange",
    "status",
    "notes",
    "playable",
    "totalFollowers",
    "avgViewsPerWeek",
    "interestRate"
  ];

  // Prevent NoSQL injection by ensuring the attribute doesn't contain dots ('.') 
  // which can accidentally overwrite nested Firestore objects.
  // We allow standard alphanumeric IDs for dynamic custom categories (e.g., 'eye_color').
  const isValidCustomKey = /^[a-zA-Z0-9_-]+$/.test(safeAttribute);

  if (!coreAttributes.includes(safeAttribute) && !isValidCustomKey) {
    return res.status(400).json({
      success: false,
      message: "Invalid attribute name provided."
    });
  }

  // Mutate req.body to ensure the downstream controllers use the safely trimmed string
  req.body.attribute = safeAttribute;
  
  next();
};