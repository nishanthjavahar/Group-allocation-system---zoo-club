/**
 * validation.js
 *
 * Request validation for Zoo Club group allocation.
 *
 * Rules:
 * 1. Name must be valid.
 * 2. DOB must be valid.
 * 3. Duplicate students with the same
 *    name + DOB are silently ignored.
 * 4. Age filtering is optional.
 * 5. Students outside the selected age range
 *    are excluded and may require confirmation.
 * 6. Number of groups cannot exceed the number
 *    of eligible students.
 */

const { calculateAge, isAgeWithinRange } = require("../services/ageCalculator");

/* =========================================================
   CUSTOM ERROR
========================================================= */

class ConfirmationRequiredError extends Error {
  constructor(message, excludedStudents = []) {
    super(message);

    this.name = "ConfirmationRequiredError";

    this.excludedStudents = excludedStudents;
  }
}

/* =========================================================
   NAME VALIDATION
========================================================= */

function isValidName(name) {
  if (typeof name !== "string" || !name.trim()) {
    return false;
  }

  /*
   * Allows:
   *
   * Rahul Kumar
   * A. Kumar
   * Sree Nishanth
   *
   * Rejects numbers/special garbage.
   */
  return /^[A-Za-zÀ-ÖØ-öø-ÿ.' -]+$/.test(name.trim());
}

/* =========================================================
   DUPLICATE KEY
========================================================= */

function buildDuplicateKey(name, dob) {
  return `${name.trim().toLowerCase()}|${String(dob).trim().toLowerCase()}`;
}

/* =========================================================
   MAIN VALIDATION
========================================================= */

function validateGenerateRequest(
  students,
  numberOfGroups,
  minAge = null,
  maxAge = null,
  confirmExclusions = false,
) {
  const errors = [];

  const excludedStudents = [];

  const validStudents = [];

  const seenStudents = new Set();

  /* =======================================================
     GROUP COUNT
  ======================================================= */

  const groupCount = Number(numberOfGroups);

  if (!Number.isInteger(groupCount) || groupCount < 1) {
    errors.push("Number of groups must be a whole number of at least 1.");
  }

  /* =======================================================
     AGE RANGE
  ======================================================= */

  if (
    minAge !== null &&
    minAge !== undefined &&
    (!Number.isInteger(Number(minAge)) ||
      Number(minAge) < 0 ||
      Number(minAge) > 120)
  ) {
    errors.push("Minimum age must be between 0 and 120.");
  }

  if (
    maxAge !== null &&
    maxAge !== undefined &&
    (!Number.isInteger(Number(maxAge)) ||
      Number(maxAge) < 0 ||
      Number(maxAge) > 120)
  ) {
    errors.push("Maximum age must be between 0 and 120.");
  }

  if (
    minAge !== null &&
    minAge !== undefined &&
    maxAge !== null &&
    maxAge !== undefined &&
    Number(minAge) > Number(maxAge)
  ) {
    errors.push("Minimum age cannot be greater than maximum age.");
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  /* =======================================================
     STUDENT INPUT
  ======================================================= */

  if (!Array.isArray(students)) {
    throw new Error("Students must be provided as an array.");
  }

  if (students.length === 0) {
    throw new Error("At least one student is required.");
  }

  /* =======================================================
     VALIDATE EACH STUDENT
  ======================================================= */

  students.forEach((student, index) => {
    const rowNumber = index + 1;

    const name = typeof student.name === "string" ? student.name.trim() : "";

    const dob = student.dob;

    /* ---------------------------------------------------
         NAME
      --------------------------------------------------- */

    if (!isValidName(name)) {
      errors.push(`Row ${rowNumber}: Invalid student name.`);

      return;
    }

    /* ---------------------------------------------------
         DOB
      --------------------------------------------------- */

    let age;

    try {
      age = calculateAge(dob);
    } catch (error) {
      errors.push(`Row ${rowNumber}: Invalid date of birth.`);

      return;
    }

    /* ---------------------------------------------------
         DUPLICATE
      --------------------------------------------------- */

    const duplicateKey = buildDuplicateKey(name, dob);

    if (seenStudents.has(duplicateKey)) {
      /*
       * Duplicate is intentionally ignored.
       *
       * It is NOT shown as an error.
       */
      return;
    }

    seenStudents.add(duplicateKey);

    /* ---------------------------------------------------
         AGE FILTER
      --------------------------------------------------- */

    const eligible = isAgeWithinRange(age, minAge, maxAge);

    if (!eligible) {
      excludedStudents.push({
        name,
        dob,
        age,
        reason: "Outside selected age range",
      });

      return;
    }

    /* ---------------------------------------------------
         VALID STUDENT
      --------------------------------------------------- */

    validStudents.push({
      ...student,
      name,
      age,
    });
  });

  /* =======================================================
     INVALID DATA
  ======================================================= */

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  /* =======================================================
     AGE EXCLUSION CONFIRMATION
  ======================================================= */

  if (excludedStudents.length > 0 && !confirmExclusions) {
    throw new ConfirmationRequiredError(
      "Some students do not match the selected age criteria.",
      excludedStudents,
    );
  }

  /* =======================================================
     NO ELIGIBLE STUDENTS
  ======================================================= */

  if (validStudents.length === 0) {
    throw new Error(
      "No eligible students remain after applying the selected age criteria.",
    );
  }

  /* =======================================================
     GROUP COUNT VS ELIGIBLE STUDENTS
  ======================================================= */

  if (groupCount > validStudents.length) {
    throw new Error(
      `Cannot create ${groupCount} groups with only ${validStudents.length} eligible students. Please reduce the number of groups or adjust the age criteria.`,
    );
  }

  /* =======================================================
     RETURN
  ======================================================= */

  return {
    students: validStudents,

    excludedStudents,

    numberOfGroups: groupCount,

    minAge: minAge === null || minAge === undefined ? null : Number(minAge),

    maxAge: maxAge === null || maxAge === undefined ? null : Number(maxAge),
  };
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  ConfirmationRequiredError,
  validateGenerateRequest,
  isValidName,
  buildDuplicateKey,
};
