/**
 * groupController.js
 *
 * Thin HTTP layer: parses the request, hands off to the services that do the
 * actual work, and shapes the response.
 */

const {
  validateGenerateRequest,
  ValidationError,
  ConfirmationRequiredError,
} = require("../utils/validation");

const {
  allocateGroups,
  AllocationError,
} = require("../services/groupAllocator");

const {
  parseStudentsFromExcel,
  ExcelParseError,
} = require("../services/excelParser");

const { handleGroupError } = require("./errorHandling");

/**
 * POST /api/groups/generate
 *
 * Body:
 * {
 *   students: [{ name, dob }],
 *   numberOfGroups: number,
 *   minAge: number | null,
 *   maxAge: number | null,
 *   confirmExclusions: boolean
 * }
 */
function generateGroups(req, res) {
  try {
    const {
      students: rawStudents,
      numberOfGroups,
      minAge = null,
      maxAge = null,
      confirmExclusions = false,
    } = req.body || {};

    let validationResult;

    try {
      validationResult = validateGenerateRequest(
        rawStudents,
        numberOfGroups,
        minAge,
        maxAge,
        confirmExclusions,
      );
    } catch (err) {
      /*
       * Age exclusions are not errors.
       *
       * Tell the frontend that confirmation is required so it can
       * display the confirmation popup.
       */
      if (err instanceof ConfirmationRequiredError) {
        return res.status(409).json({
          requiresConfirmation: true,
          message: "Some students do not match the selected age criteria.",
          excludedStudents: err.excludedStudents,
        });
      }

      throw err;
    }

    const {
      students,
      numberOfGroups: groupCount,
      excludedStudents = [],
    } = validationResult;

    const { groups, ageDistribution } = allocateGroups(students, groupCount);

    res.json({
      summary: {
        totalStudents: students.length,
        numberOfGroups: groupCount,
        excludedStudents: excludedStudents.length,
      },
      groups,
      ageDistribution,
      excludedStudents,
    });
  } catch (err) {
    handleGroupError(err, res);
  }
}

/**
 * POST /api/groups/parse-excel
 *
 * multipart/form-data with a single file field named "file".
 */
function parseExcelUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file was uploaded.",
        details: ["Please choose an .xlsx or .xls file to upload."],
      });
    }

    const students = parseStudentsFromExcel(req.file.buffer).map(
      ({ name, dob }) => ({
        name,
        dob,
      }),
    );

    res.json({ students });
  } catch (err) {
    handleGroupError(err, res);
  }
}

module.exports = {
  generateGroups,
  parseExcelUpload,
};
