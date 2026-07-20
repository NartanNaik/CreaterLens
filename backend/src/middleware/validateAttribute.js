export const validateAttribute = (
  req,
  res,
  next
) => {
  const allowedAttributes = [
    "nation",
    "interestRate",
    "status",
    "notes"
  ];

  const {
    attribute
  } = req.body;

  if (
    attribute &&
    !allowedAttributes.includes(attribute)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid attribute."
    });
  }

  next();
};