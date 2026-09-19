/**
 * ageCalculator.js
 *
 * Single source of truth for anything involving a student's date of birth.
 *
 * Design decisions:
 *
 * 1. Dates are handled as calendar dates, never as instants in time.
 *    We normalise dates to UTC midnight and compare only
 *    year/month/day components.
 *
 * 2. The parser accepts the date formats used by the Zoo Club system:
 *      - DD/MM/YYYY
 *      - MM/DD/YYYY
 *      - DD-MM-YYYY
 *      - MM-DD-YYYY
 *      - YYYY-MM-DD
 *      - ISO / Excel timestamps
 *
 * 3. When a slash/dash date is ambiguous, DD/MM/YYYY is used.
 *
 * 4. Age restrictions are OPTIONAL.
 *    null means "no restriction".
 *
 *    Examples:
 *      isAgeWithinRange(25, null, null) -> true
 *      isAgeWithinRange(25, 10, null)   -> true
 *      isAgeWithinRange(25, null, 18)   -> false
 *      isAgeWithinRange(25, 10, 30)     -> true
 */

const { MAX_REASONABLE_AGE } = require("../config/constants");

/**
 * Error type for anything the coordinator can fix
 * by correcting their input.
 */
class DateOfBirthError extends Error {
  constructor(message) {
    super(message);
    this.name = "DateOfBirthError";
  }
}

/**
 * YYYY-MM-DD
 */
const ISO_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

/**
 * ISO / Excel timestamp.
 *
 * Examples:
 *
 * 1990-11-08T18:29:50.000Z
 * 1997-02-06T18:29:50Z
 * 2000-01-01T00:00:00+05:30
 */
const ISO_DATETIME_PATTERN =
  /^(\d{4})-(\d{1,2})-(\d{1,2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

/**
 * DD/MM/YYYY
 * MM/DD/YYYY
 * DD-MM-YYYY
 * MM-DD-YYYY
 */
const SLASH_OR_DASH_PATTERN = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

/**
 * Build a UTC-midnight Date from calendar parts.
 *
 * JavaScript normally rolls invalid dates over:
 *
 *     31/02/2020
 *          ↓
 *     02/03/2020
 *
 * We don't want that.
 *
 * So we create the date and verify that all components
 * survived unchanged.
 */
function buildCalendarDate(year, month, day) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  const survivedRoundTrip =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return survivedRoundTrip ? date : null;
}

/**
 * Today's date as a calendar date at UTC midnight.
 *
 * We use the local calendar date seen by the coordinator,
 * then pin that date to UTC.
 */
function today() {
  const now = new Date();

  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Parse a date of birth into a normalised calendar date.
 *
 * Supported:
 *
 * - Date object
 * - YYYY-MM-DD
 * - DD/MM/YYYY
 * - MM/DD/YYYY
 * - DD-MM-YYYY
 * - MM-DD-YYYY
 * - ISO timestamps from Excel
 *
 * Ambiguous dates such as:
 *
 *     05/06/2000
 *
 * are interpreted as:
 *
 *     05 June 2000
 *
 * because DD/MM/YYYY is the default convention
 * for this India-based application.
 *
 * @param {Date|string} value
 * @returns {Date}
 * @throws {DateOfBirthError}
 */
function parseDateOfBirth(value) {
  if (value === null || value === undefined || value === "") {
    throw new DateOfBirthError("Date of birth is required.");
  }

  /**
   * Excel / JavaScript Date object.
   */
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new DateOfBirthError("Date of birth is not a valid date.");
    }

    const date = buildCalendarDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );

    if (!date) {
      throw new DateOfBirthError("Date of birth is not a valid calendar date.");
    }

    return date;
  }

  /**
   * Numbers are not accepted here as DOBs.
   *
   * Excel date serial numbers should ideally be converted
   * by the Excel parser before reaching this service.
   */
  if (typeof value !== "string") {
    throw new DateOfBirthError("Date of birth must be a date or a text value.");
  }

  const text = value.trim();

  let year;
  let month;
  let day;

  /**
   * ----------------------------------------------------------
   * YYYY-MM-DD
   * ----------------------------------------------------------
   */
  const isoMatch = ISO_PATTERN.exec(text);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  }

  /**
   * ----------------------------------------------------------
   * ISO / Excel timestamp
   *
   * Example:
   *
   * 1990-11-08T18:29:50.000Z
   * ----------------------------------------------------------
   */
  if (year === undefined) {
    const isoDateTimeMatch = ISO_DATETIME_PATTERN.exec(text);

    if (isoDateTimeMatch) {
      year = Number(isoDateTimeMatch[1]);
      month = Number(isoDateTimeMatch[2]);
      day = Number(isoDateTimeMatch[3]);
    }
  }

  /**
   * ----------------------------------------------------------
   * DD/MM/YYYY
   * MM/DD/YYYY
   * DD-MM-YYYY
   * MM-DD-YYYY
   * ----------------------------------------------------------
   */
  if (year === undefined) {
    const match = SLASH_OR_DASH_PATTERN.exec(text);

    if (match) {
      const first = Number(match[1]);
      const second = Number(match[2]);

      year = Number(match[3]);

      /**
       * MM/DD/YYYY
       *
       * Example:
       *
       * 10/22/1997
       *
       * 22 cannot be a month,
       * therefore:
       *
       * month = 10
       * day = 22
       */
      if (first <= 12 && second > 12) {
        month = first;
        day = second;
      } else if (first > 12 && second <= 12) {

      /**
       * DD/MM/YYYY
       *
       * Example:
       *
       * 22/10/1997
       *
       * 22 cannot be a month,
       * therefore:
       *
       * day = 22
       * month = 10
       */
        day = first;
        month = second;
      } else {

      /**
       * Ambiguous.
       *
       * Example:
       *
       * 05/06/2000
       *
       * Default:
       *
       * DD/MM/YYYY
       */
        day = first;
        month = second;
      }
    }
  }

  /**
   * Nothing matched.
   */
  if (year === undefined || month === undefined || day === undefined) {
    throw new DateOfBirthError(
      `"${text}" is not a recognised date of birth. ` +
        "Use DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD.",
    );
  }

  /**
   * Verify that the date actually exists.
   */
  const date = buildCalendarDate(year, month, day);

  if (!date) {
    throw new DateOfBirthError(`"${text}" is not a real calendar date.`);
  }

  return date;
}

/**
 * Calculate a student's age in completed years.
 *
 * We do NOT simply do:
 *
 *     currentYear - birthYear
 *
 * because the birthday may not have happened yet this year.
 *
 * @param {Date|string} dateOfBirth
 * @param {Date} referenceDate
 * @returns {number}
 */
function calculateAge(dateOfBirth, referenceDate = today()) {
  const birth = parseDateOfBirth(dateOfBirth);

  const reference = parseDateOfBirth(referenceDate);

  /**
   * Future DOBs are invalid.
   */
  if (birth.getTime() > reference.getTime()) {
    throw new DateOfBirthError("Date of birth cannot be in the future.");
  }

  let age = reference.getUTCFullYear() - birth.getUTCFullYear();

  /**
   * Check whether the birthday has already
   * happened in the reference year.
   */
  const birthdayHasPassed =
    reference.getUTCMonth() > birth.getUTCMonth() ||
    (reference.getUTCMonth() === birth.getUTCMonth() &&
      reference.getUTCDate() >= birth.getUTCDate());

  if (!birthdayHasPassed) {
    age -= 1;
  }

  /**
   * Sanity check.
   *
   * This is NOT the Zoo Club membership age range.
   *
   * It only catches obviously incorrect DOBs.
   */
  if (age > MAX_REASONABLE_AGE) {
    throw new DateOfBirthError("Date of birth is unrealistically old.");
  }

  return age;
}

/**
 * Check whether an age falls inside an OPTIONAL
 * configured age range.
 *
 * IMPORTANT:
 *
 * null means there is no restriction.
 *
 * Examples:
 *
 * isAgeWithinRange(28, null, null)
 * -> true
 *
 * isAgeWithinRange(28, 10, null)
 * -> true
 *
 * isAgeWithinRange(28, null, 18)
 * -> false
 *
 * isAgeWithinRange(28, 10, 30)
 * -> true
 */
function isAgeWithinRange(age, minAge = null, maxAge = null) {
  if (!Number.isInteger(age)) {
    return false;
  }

  /**
   * Optional minimum.
   */
  if (minAge !== null && minAge !== undefined) {
    if (!Number.isInteger(Number(minAge))) {
      return false;
    }

    if (age < Number(minAge)) {
      return false;
    }
  }

  /**
   * Optional maximum.
   */
  if (maxAge !== null && maxAge !== undefined) {
    if (!Number.isInteger(Number(maxAge))) {
      return false;
    }

    if (age > Number(maxAge)) {
      return false;
    }
  }

  return true;
}

/**
 * Format a calendar date as DD/MM/YYYY.
 */
function formatDateForDisplay(dateOfBirth) {
  const date = parseDateOfBirth(dateOfBirth);

  const day = String(date.getUTCDate()).padStart(2, "0");

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${day}/${month}/${date.getUTCFullYear()}`;
}

/**
 * Format a calendar date as YYYY-MM-DD.
 *
 * This is the canonical format used
 * between frontend and backend.
 */
function formatDateISO(dateOfBirth) {
  return parseDateOfBirth(dateOfBirth).toISOString().slice(0, 10);
}

/**
 * Enrich a student record with:
 *
 * - calculated age
 * - canonical DOB
 * - display DOB
 */
function withCalculatedAge(student, referenceDate = today()) {
  const age = calculateAge(student.dob, referenceDate);

  return {
    ...student,
    age,
    dob: formatDateISO(student.dob),
    dobDisplay: formatDateForDisplay(student.dob),
  };
}

module.exports = {
  DateOfBirthError,
  today,
  parseDateOfBirth,
  calculateAge,
  isAgeWithinRange,
  formatDateForDisplay,
  formatDateISO,
  withCalculatedAge,
};
