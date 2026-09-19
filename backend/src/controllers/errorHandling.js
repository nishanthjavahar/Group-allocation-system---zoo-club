/**
 * errorHandling.js
 *
 * One place that decides how a known error type becomes an HTTP response.
 * Shared by every controller so the mapping (and the "never leak a stack
 * trace" rule from spec section 16) only has to be gotten right once.
 */

const { ValidationError } = require('../utils/validation');
const { AllocationError } = require('../services/groupAllocator');
const { ExcelParseError } = require('../services/excelParser');
const { PdfGenerationError } = require('../services/pdfGenerator');

function handleGroupError(err, res) {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message, details: err.details });
  }
  if (err instanceof AllocationError) {
    return res.status(400).json({ error: err.message, details: [err.message] });
  }
  if (err instanceof ExcelParseError) {
    return res.status(400).json({ error: err.message, details: err.details });
  }
  if (err instanceof PdfGenerationError) {
    return res.status(500).json({ error: err.message, details: [err.message] });
  }

  // eslint-disable-next-line no-console
  console.error('Unexpected server error:', err);
  return res.status(500).json({
    error: 'Something went wrong on the server. Please try again.',
    details: ['Something went wrong on the server. Please try again.'],
  });
}

module.exports = { handleGroupError };
