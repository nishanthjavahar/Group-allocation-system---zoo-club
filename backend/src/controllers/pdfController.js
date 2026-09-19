/**
 * pdfController.js
 *
 * Regenerates the allocation server-side from the same request body the
 * preview screen already has (rather than trusting a client-computed
 * grouping), then renders it to PDF. Because `allocateGroups` is
 * deterministic, re-running it here reproduces exactly what the coordinator
 * is looking at on screen.
 */

const { validateGenerateRequest } = require('../utils/validation');
const { allocateGroups } = require('../services/groupAllocator');
const { generateGroupAllocationPdf } = require('../services/pdfGenerator');
const { handleGroupError } = require('./errorHandling');

/**
 * POST /api/groups/pdf
 * Body: { students: [{name, dob}], numberOfGroups: number }
 * Response: application/pdf binary stream
 */
async function downloadGroupsPdf(req, res) {
  try {
    const { students: rawStudents, numberOfGroups } = req.body || {};
    const { students, numberOfGroups: groupCount } = validateGenerateRequest(
      rawStudents,
      numberOfGroups
    );

    const { groups, ageDistribution } = allocateGroups(students, groupCount);

    const pdfBuffer = await generateGroupAllocationPdf({
      groups,
      ageDistribution,
      summary: { totalStudents: students.length, numberOfGroups: groupCount },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="zoo-club-group-allocation.pdf"'
    );
    res.send(pdfBuffer);
  } catch (err) {
    handleGroupError(err, res);
  }
}

module.exports = { downloadGroupsPdf };
