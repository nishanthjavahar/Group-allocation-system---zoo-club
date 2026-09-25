/**
 * pdfController.js
 *
 * Handles PDF generation for group allocations.
 *
 * The frontend sends:
 * - students
 * - numberOfGroups
 * - include  -> selected PDF fields
 * - title    -> custom report title
 */

const { validateGenerateRequest } = require("../utils/validation");
const { allocateGroups } = require("../services/groupAllocator");
const { generateGroupAllocationPdf } = require("../services/pdfGenerator");
const { handleGroupError } = require("./errorHandling");

/**
 * POST /api/groups/pdf
 *
 * Request body:
 *
 * {
 *   students: [
 *     {
 *       name,
 *       dob
 *     }
 *   ],
 *   numberOfGroups: 5,
 *   include: ["name", "dob", "age"],
 *   title: "Zoo Club 2026 - 2027"
 * }
 *
 * Response:
 * application/pdf
 */
async function downloadGroupsPdf(req, res) {
  try {
    // --------------------------------------------------
    // 1. READ REQUEST DATA
    // --------------------------------------------------

    const {
      students: rawStudents,
      numberOfGroups,
      include,
      title: rawTitle,
    } = req.body || {};

    // --------------------------------------------------
    // 2. VALIDATE STUDENTS AND NUMBER OF GROUPS
    // --------------------------------------------------

    const { students, numberOfGroups: groupCount } = validateGenerateRequest(
      rawStudents,
      numberOfGroups,
    );

    // --------------------------------------------------
    // 3. VALIDATE REPORT TITLE
    // --------------------------------------------------

    const title = typeof rawTitle === "string" ? rawTitle.trim() : "";

    if (!title) {
      return res.status(400).json({
        error: "PDF generation failed.",
        details: ["Please enter a report title."],
      });
    }

    // --------------------------------------------------
    // 4. VALIDATE PDF FIELDS
    // --------------------------------------------------

    const allowedFields = new Set(["name", "dob", "age"]);

    /*
     * If the frontend sends selected fields,
     * use those fields.
     *
     * If include is missing, keep the old behaviour
     * and include all three fields.
     */
    const requestedFields = Array.isArray(include)
      ? include.filter((field) => allowedFields.has(field))
      : ["name", "dob", "age"];

    /*
     * Remove duplicate fields.
     */
    const pdfFields = [...new Set(requestedFields)];

    /*
     * At least one field must be selected.
     */
    if (pdfFields.length === 0) {
      return res.status(400).json({
        error: "PDF generation failed.",
        details: ["Please select at least one student field for the PDF."],
      });
    }

    // --------------------------------------------------
    // 5. GENERATE GROUP ALLOCATION
    // --------------------------------------------------

    const { groups, ageDistribution } = allocateGroups(students, groupCount);

    // --------------------------------------------------
    // 6. GENERATE PDF
    // --------------------------------------------------

    const pdfBuffer = await generateGroupAllocationPdf({
      groups,
      ageDistribution,

      summary: {
        totalStudents: students.length,
        numberOfGroups: groupCount,
      },

      /*
       * Selected fields:
       *
       * ["name"]
       * ["name", "dob"]
       * ["name", "age"]
       * ["name", "dob", "age"]
       */
      pdfFields,

      /*
       * Custom report title entered
       * by the user.
       */
      title,
    });

    // --------------------------------------------------
    // 7. PDF RESPONSE
    // --------------------------------------------------

    res.setHeader("Content-Type", "application/pdf");

    // --------------------------------------------------
    // 8. CREATE SAFE PDF FILENAME
    // --------------------------------------------------

    /*
     * Convert the custom title into a safe filename.
     *
     * Example:
     *
     * Zoo Club 2026 - 2027
     *       ↓
     * Zoo Club 2026 - 2027.pdf
     */

    const safeFilename =
      title
        // Remove characters that are not safe in filenames
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")

        // Convert multiple spaces into one
        .replace(/\s+/g, " ")

        // Remove spaces from beginning/end
        .trim()

        // Prevent extremely long filenames
        .slice(0, 100) ||
      // Fallback filename
      "group-allocation-report";

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}.pdf"`,
    );

    // --------------------------------------------------
    // 9. SEND PDF
    // --------------------------------------------------

    res.send(pdfBuffer);
  } catch (err) {
    // --------------------------------------------------
    // 10. EXISTING ERROR HANDLER
    // --------------------------------------------------

    handleGroupError(err, res);
  }
}

module.exports = {
  downloadGroupsPdf,
};
