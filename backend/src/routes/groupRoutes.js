/**
 * groupRoutes.js
 *
 * Route wiring only. Multer is configured here (not in the controller) so
 * upload limits are visible right alongside the route that accepts files.
 */

const express = require('express');
const multer = require('multer');

const { generateGroups, parseExcelUpload } = require('../controllers/groupController');
const { downloadGroupsPdf } = require('../controllers/pdfController');

const router = express.Router();

// Files are kept in memory (never written to disk) since they are small
// spreadsheets that get parsed once and discarded — no need for temp-file
// cleanup logic.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB is generous for a student roster
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(xlsx|xls)$/i;
    if (!allowedExtensions.test(file.originalname)) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

/** Wraps multer's callback-style error (thrown before Express's normal error
 * handling kicks in) into the same JSON error shape every other endpoint uses. */
function uploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    if (err.message === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        error: 'Invalid file type. Please upload a .xlsx or .xls file.',
        details: ['Invalid file type. Please upload a .xlsx or .xls file.'],
      });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'The uploaded file is too large (5 MB max).',
        details: ['The uploaded file is too large (5 MB max).'],
      });
    }
    return res.status(400).json({
      error: 'Unable to process the uploaded file.',
      details: ['Unable to process the uploaded file.'],
    });
  });
}

router.post('/generate', generateGroups);
router.post('/parse-excel', uploadMiddleware, parseExcelUpload);
router.post('/pdf', downloadGroupsPdf);

module.exports = router;
