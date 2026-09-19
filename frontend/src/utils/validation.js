/**
 * validation.js (frontend)
 *
 * Accepts:
 *   - DD/MM/YYYY
 *   - MM/DD/YYYY
 *   - DD-MM-YYYY
 *   - MM-DD-YYYY
 *   - YYYY-MM-DD
 *   - ISO date/time strings from Excel
 *   - JavaScript Date objects
 *   - Excel serial date numbers
 */

const ISO_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

const ISO_DATETIME_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})T/;

const FLEXIBLE_DATE_PATTERN = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

function isRealCalendarDate(year, month, day) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Convert an Excel serial date into calendar components.
 *
 * Excel's date system starts at 1899-12-30.
 */
function parseExcelSerial(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const excelEpoch = Date.UTC(1899, 11, 30);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  const date = new Date(excelEpoch + Math.floor(value) * millisecondsPerDay);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/**
 * Parse a JavaScript Date object.
 */
function parseDateObject(value) {
  if (!(value instanceof Date)) {
    return null;
  }

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

/**
 * Parse any supported date representation.
 */
function parseDateOfBirth(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // JavaScript Date object
  if (value instanceof Date) {
    const parsed = parseDateObject(value);

    if (parsed && isRealCalendarDate(parsed.year, parsed.month, parsed.day)) {
      return parsed;
    }

    return null;
  }

  // Excel serial number
  if (typeof value === "number") {
    const parsed = parseExcelSerial(value);

    if (parsed && isRealCalendarDate(parsed.year, parsed.month, parsed.day)) {
      return parsed;
    }

    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!text) {
    return null;
  }

  // ------------------------------------------------------------
  // YYYY-MM-DD
  // ------------------------------------------------------------

  let match = ISO_PATTERN.exec(text);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!isRealCalendarDate(year, month, day)) {
      return null;
    }

    return { year, month, day };
  }

  // ------------------------------------------------------------
  // ISO / Excel timestamp
  //
  // Example:
  // 1990-11-08T18:29:50.000Z
  // ------------------------------------------------------------

  match = ISO_DATETIME_PATTERN.exec(text);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!isRealCalendarDate(year, month, day)) {
      return null;
    }

    return { year, month, day };
  }

  // ------------------------------------------------------------
  // DD/MM/YYYY
  // MM/DD/YYYY
  // DD-MM-YYYY
  // MM-DD-YYYY
  // ------------------------------------------------------------

  match = FLEXIBLE_DATE_PATTERN.exec(text);

  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);

    let day;
    let month;

    /*
     * Unambiguous MM/DD/YYYY:
     *
     * 10/22/1997
     * first = 10
     * second = 22
     *
     * Since 22 cannot be a month:
     * month = 10
     * day = 22
     */
    if (second > 12 && first <= 12) {
      month = first;
      day = second;
    } else if (first > 12 && second <= 12) {
      /*
       * Unambiguous DD/MM/YYYY:
       *
       * 22/10/1997
       * first = 22
       * second = 10
       *
       * Since 22 cannot be a month:
       * day = 22
       * month = 10
       */
      day = first;
      month = second;
    } else {
      /*
       * Ambiguous:
       *
       * 05/06/2000
       *
       * Both 05 and 06 can be months.
       *
       * Since this application is in India, default to DD/MM/YYYY.
       */
      day = first;
      month = second;
    }

    if (!isRealCalendarDate(year, month, day)) {
      return null;
    }

    return { year, month, day };
  }

  return null;
}

/**
 * Determine whether the parsed DOB is in the future.
 */
function isFutureDate(year, month, day) {
  const dob = new Date(Date.UTC(year, month - 1, day));

  const today = new Date();

  const todayUtc = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  return dob.getTime() > todayUtc.getTime();
}

/**
 * Validate one student.
 */
export function validateStudentRow(student) {
  if (!student.name || !student.name.trim()) {
    return "Name is required.";
  }

  if (student.dob === null || student.dob === undefined || student.dob === "") {
    return "Date of birth is required.";
  }

  const parsed = parseDateOfBirth(student.dob);

  if (!parsed) {
    return (
      "Date of birth must be a valid DD/MM/YYYY, " +
      "MM/DD/YYYY, or YYYY-MM-DD date."
    );
  }

  if (isFutureDate(parsed.year, parsed.month, parsed.day)) {
    return "Date of birth cannot be in the future.";
  }

  return null;
}

/**
 * Validate the complete roster.
 *
 * Age restrictions are NOT applied here.
 * They will be configurable through the group settings.
 */
export function validateForm(students, numberOfGroups) {
  const problems = [];

  const nonEmptyRows = students.filter(
    (student) => student.name?.trim() || student.dob,
  );

  if (nonEmptyRows.length === 0) {
    problems.push("Please enter at least one student.");

    return problems;
  }

  nonEmptyRows.forEach((student, index) => {
    const error = validateStudentRow(student);

    if (error) {
      const label = student.name?.trim() || `Row ${index + 1}`;

      problems.push(`${label}: ${error}`);
    }
  });

  const groups = Number(numberOfGroups);

  if (!Number.isInteger(groups) || groups < 1) {
    problems.push("Number of groups must be a whole number of at least 1.");
  } else if (groups > nonEmptyRows.length) {
    problems.push("Number of groups cannot exceed the number of students.");
  }

  return problems;
}
export function validateGroupCount(studentCount, numberOfGroups) {
  const errors = [];

  const groups = Number(numberOfGroups);

  if (!Number.isInteger(groups) || groups < 1) {
    errors.push("Number of groups must be at least 1.");

    return errors;
  }

  if (groups > studentCount) {
    errors.push(
      `Cannot create ${groups} groups with only ${studentCount} students. Please enter at least ${groups} students or reduce the number of groups.`,
    );
  }

  return errors;
}
