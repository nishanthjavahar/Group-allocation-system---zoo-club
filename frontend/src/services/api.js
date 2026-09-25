/**
 * api.js
 *
 * Every call to the backend goes through this file.
 * Components only deal with plain JS data and loading/error state.
 */

import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

/**
 * Normalise an axios error into the shape expected by the frontend.
 *
 * Special case:
 * HTTP 409 is used when the backend needs confirmation before
 * excluding students that don't match the selected age criteria.
 */
function toFriendlyError(err) {
  const data = err.response && err.response.data;

  /*
   * Age criteria confirmation.
   *
   * The backend deliberately returns HTTP 409 with:
   *
   * {
   *   requiresConfirmation: true,
   *   excludedStudents: [...]
   * }
   */
  if (data && data.requiresConfirmation) {
    return {
      message:
        data.message || "Some students do not match the selected age criteria.",
      details: data.details || [],
      requiresConfirmation: true,
      excludedStudents: data.excludedStudents || [],
    };
  }

  /*
   * Normal backend validation/application error.
   */
  if (data && (data.error || data.details)) {
    return {
      message: data.error || "Something went wrong.",
      details: data.details || [data.error || "Something went wrong."],
      requiresConfirmation: false,
      excludedStudents: [],
    };
  }

  /*
   * Request timed out.
   */
  if (err.code === "ECONNABORTED") {
    return {
      message: "The request timed out. Please try again.",
      details: ["The request timed out. Please try again."],
      requiresConfirmation: false,
      excludedStudents: [],
    };
  }

  /*
   * Server unreachable / unexpected error.
   */
  return {
    message:
      "Unable to reach the server. Please check your connection and try again.",
    details: [
      "Unable to reach the server. Please check your connection and try again.",
    ],
    requiresConfirmation: false,
    excludedStudents: [],
  };
}

/**
 * Generate groups.
 *
 * @param {{name:string, dob:string}[]} students
 * @param {number} numberOfGroups
 * @param {number|null} minAge
 * @param {number|null} maxAge
 * @param {boolean} confirmExclusions
 */
export async function generateGroups(
  students,
  numberOfGroups,
  minAge = null,
  maxAge = null,
  confirmExclusions = false,
) {
  try {
    const { data } = await client.post("/groups/generate", {
      students,
      numberOfGroups,
      minAge,
      maxAge,
      confirmExclusions,
    });

    return data;
  } catch (err) {
    throw toFriendlyError(err);
  }
}

/**
 * Parse an uploaded Excel file.
 *
 * @param {File} file
 * @returns {{ students: {name:string, dob:string}[] }}
 */
export async function parseExcelFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await client.post("/groups/parse-excel", formData);

    console.log("EXCEL API RESPONSE:", data);
    console.log("EXCEL STUDENTS:", data?.students);

    return data;
  } catch (err) {
    console.error("EXCEL UPLOAD ERROR:", err);
    throw toFriendlyError(err);
  }
}

/**
 * Downloads the PDF report.
 *
 * Uses the same students and numberOfGroups already used
 * to generate the on-screen preview.
 */
export async function downloadGroupsPdf(
  students,
  numberOfGroups,
  include = ["name", "dob", "age"],
  title = "Group Allocation Report",
) {
  try {
    const response = await client.post(
      "/groups/pdf",
      {
        students,
        numberOfGroups,
        include,
        title,
      },
      {
        responseType: "blob",
      },
    );

    const url = window.URL.createObjectURL(
      new Blob([response.data], {
        type: "application/pdf",
      }),
    );

    const link = document.createElement("a");

    link.href = url;
    link.download = "zoo-club-group-allocation.pdf";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    /*
     * A blob error response needs to be read as text/JSON
     * before it can be interpreted.
     */
    if (err.response && err.response.data instanceof Blob) {
      let parsedError = null;

      try {
        const text = await err.response.data.text();
        parsedError = JSON.parse(text);
      } catch {
        parsedError = null;
      }

      if (parsedError) {
        throw {
          message: parsedError.error || "Unable to download the PDF.",
          details: parsedError.details || [
            parsedError.error || "Unable to download the PDF.",
          ],
          requiresConfirmation: false,
          excludedStudents: [],
        };
      }
    }

    throw toFriendlyError(err);
  }
}
