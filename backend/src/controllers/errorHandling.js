function handleGroupError(err, res) {
  console.error("Backend error:", err);

  // Confirmation required
  if (err && err.name === "ConfirmationRequiredError") {
    return res.status(409).json({
      requiresConfirmation: true,
      message:
        err.message || "Some students do not match the selected age criteria.",
      excludedStudents: err.excludedStudents || [],
    });
  }

  // Validation errors
  if (
    err &&
    (err.name === "ValidationError" || err.code === "VALIDATION_ERROR")
  ) {
    return res.status(400).json({
      error: err.message || "Validation failed.",
      details: err.details || [],
      excludedStudents: err.excludedStudents || [],
    });
  }

  // Allocation errors
  if (
    err &&
    (err.name === "AllocationError" || err.code === "ALLOCATION_ERROR")
  ) {
    return res.status(400).json({
      error: err.message || "Unable to generate groups.",
      details: err.details || [],
    });
  }

  // PDF errors
  if (err && err.name === "PdfGenerationError") {
    return res.status(500).json({
      error: "PDF generation failed.",
      details: [err.message || "Unable to generate PDF."],
    });
  }

  // Generic server error
  return res.status(500).json({
    error: "Unable to process the request.",
    details: [
      err && err.message ? err.message : "An unexpected server error occurred.",
    ],
  });
}

module.exports = {
  handleGroupError,
};
