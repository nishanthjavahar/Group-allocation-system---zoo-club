/**
 * excelParser.js
 *
 * Reads an uploaded .xlsx/.xls file and turns it into the same raw student
 * shape the manual-entry form produces: [{ name, dob }, ...].
 *
 * This file does NOT calculate ages or apply Zoo Club business rules (min/max
 * age, duplicates) — that is `utils/validation.js`'s job, and it runs on
 * whatever this parser returns, exactly like it runs on manually-entered data.
 * Keeping the two separate means "upload a file" and "type it in by hand" are
 * validated by the exact same code path, so nothing sneaks past one route.
 *
 * What THIS file is responsible for is purely structural: is it a real
 * spreadsheet, does it have the right columns, is it non-empty. Those are
 * problems specific to *files* that a manually-entered roster can't have.
 */

const XLSX = require("xlsx");

class ExcelParseError extends Error {
  /**
   * @param {string} message
   * @param {string[]} [details] one entry per problem, for display to the coordinator
   */
  constructor(message, details = [message]) {
    super(message);
    this.name = "ExcelParseError";
    this.details = details;
  }
}

/** Column headers we accept, matched case-insensitively with whitespace trimmed. */
const NAME_HEADERS = ["name", "student name"];
const DOB_HEADERS = ["date of birth", "dob"];

function normaliseHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase();
}

/**
 * Find which spreadsheet column holds a given field, by matching against a
 * list of accepted header spellings. Returns the header string as it
 * literally appears in the sheet, so it can be used as an object key.
 */
function findColumn(headerRow, acceptedNames) {
  return headerRow.find((header) =>
    acceptedNames.includes(normaliseHeader(header)),
  );
}

/**
 * A cell holding a date can arrive from the `xlsx` package as:
 *   - a JS Date object (when the sheet cell was formatted as a date and we
 *     ask the library to parse dates, see `cellDates: true` below)
 *   - a plain string, when the coordinator typed the date as text
 *   - a number, on the rare sheet where date formatting was lost and Excel's
 *     raw "days since 1900" serial is left behind
 * We pass all three straight through: `ageCalculator.parseDateOfBirth`
 * already handles Dates and date-like strings, and a bare serial number is
 * exactly the "Invalid Date of Birth" case validation.js is meant to catch,
 * so we don't need special handling here beyond turning it into a string.
 */
function normaliseCellValue(value) {
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}
/**
 * Parse an uploaded Excel buffer into raw student records.
 *
 * @param {Buffer} fileBuffer
 * @returns {{ name: string, dob: * }[]}
 * @throws {ExcelParseError}
 */
function parseStudentsFromExcel(fileBuffer) {
  let workbook;
  try {
    // cellDates: true makes the library hand back real Date objects for
    // date-formatted cells instead of raw Excel serial numbers.
    workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  } catch (err) {
    throw new ExcelParseError(
      "The uploaded file could not be read. Please upload a valid .xlsx or .xls file.",
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ExcelParseError("The uploaded file does not contain any sheets.");
  }
  const sheet = workbook.Sheets[sheetName];

  // header: 1 -> rows come back as arrays of cell values, not objects, so we
  // can inspect and validate the header row ourselves before trusting it.
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (rows.length === 0) {
    throw new ExcelParseError("The uploaded spreadsheet is empty.");
  }

  const headerRow = rows[0];
  const nameColumn = findColumn(headerRow, NAME_HEADERS);
  const dobColumn = findColumn(headerRow, DOB_HEADERS);

  if (!nameColumn || !dobColumn) {
    const missing = [];
    if (!nameColumn) missing.push('"Name"');
    if (!dobColumn) missing.push('"Date of Birth"');
    throw new ExcelParseError(
      `The uploaded Excel file does not contain the required columns: ${missing.join(" and ")}. ` +
        'Expected columns are "Name" and "Date of Birth".',
    );
  }

  const nameIndex = headerRow.indexOf(nameColumn);
  const dobIndex = headerRow.indexOf(dobColumn);

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    throw new ExcelParseError(
      "The uploaded spreadsheet has headers but no student rows.",
    );
  }

  const students = [];
  const structuralProblems = [];

  dataRows.forEach((row, index) => {
    const excelRowNumber = index + 2; // +1 for header, +1 for 1-based row numbers
    const rawName = row[nameIndex];
    const rawDob = row[dobIndex];

    const isCompletelyBlankRow =
      (rawName === undefined || rawName === "") &&
      (rawDob === undefined || rawDob === "");
    if (isCompletelyBlankRow) {
      return; // a fully blank row is not a data-entry mistake, just skip it
    }

    students.push({
      name: normaliseCellValue(rawName),
      dob: normaliseCellValue(rawDob),
      _excelRow: excelRowNumber,
    });
  });

  if (students.length === 0) {
    throw new ExcelParseError(
      "The uploaded spreadsheet has headers but no student rows.",
    );
  }

  if (structuralProblems.length > 0) {
    throw new ExcelParseError(
      "The uploaded Excel file has structural problems.",
      structuralProblems,
    );
  }

  return students;
}

module.exports = {
  ExcelParseError,
  parseStudentsFromExcel,
};
