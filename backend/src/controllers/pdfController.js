/**
 * pdfController.js
 *
 * Regenerates the allocation server-side from the same request body the
 * preview screen already has, then renders it to PDF.
 */

const { validateGenerateRequest } = require("../utils/validation");
const { allocateGroups } = require("../services/groupAllocator");
const { generateGroupAllocationPdf } = require("../services/pdfGenerator");
const { handleGroupError } = require("./errorHandling");

/**
 * POST /api/groups/pdf
 *
 * Body:
 *
 * {
 *   students: [
 *     {
 *       name,
 *       dob
 *     }
 *   ],
 *
 *   numberOfGroups: number,
 *
 *   include: [
 *     "name",
 *     "dob",
 *     "age"
 *   ]
 * }
 *
 * Response:
 * application/pdf binary stream
 */
async function downloadGroupsPdf(req, res) {
  try {
    const { students: rawStudents, numberOfGroups, include } = req.body || {};

    /*
     * Validate and enrich the student data.
     */
    const { students, numberOfGroups: groupCount } = validateGenerateRequest(
      rawStudents,
      numberOfGroups,
    );

    /*
     * Only these fields are allowed in the PDF.
     */
    const allowedFields = new Set(["name", "dob", "age"]);

    /*
     * If the frontend sends a selection,
     * use it.
     *
     * If an older frontend sends no selection,
     * preserve the old behaviour and include everything.
     */
    const requestedFields = Array.isArray(include)
      ? include.filter((field) => allowedFields.has(field))
      : ["name", "dob", "age"];

    /*
     * Remove duplicates.
     */
    const pdfFields = [...new Set(requestedFields)];

    /*
     * Never generate a PDF with no student information.
     */
    if (pdfFields.length === 0) {
      return res.status(400).json({
        error: "PDF generation failed.",
        details: ["Please select at least one student field for the PDF."],
      });
    }

    /*
     * Generate the exact same deterministic allocation
     * used by the application.
     */
    const { groups, ageDistribution } = allocateGroups(students, groupCount);

    /*
     * Generate PDF with the selected fields.
     */
    const pdfBuffer = await generateGroupAllocationPdf({
      groups,
      ageDistribution,

      summary: {
        totalStudents: students.length,
        numberOfGroups: groupCount,
      },

      pdfFields,
    });

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="zoo-club-group-allocation.pdf"',
    );

    res.send(pdfBuffer);
  } catch (err) {
    handleGroupError(err, res);
  }
}

module.exports = {
  downloadGroupsPdf,
};
