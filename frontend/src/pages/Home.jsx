import { useState } from "react";

import Header from "../components/Header.jsx";
import StudentForm from "../components/StudentForm.jsx";
import StudentTable from "../components/StudentTable.jsx";
import ExcelUpload from "../components/ExcelUpload.jsx";
import GroupConfiguration from "../components/GroupConfiguration.jsx";
import GroupPreview from "../components/GroupPreview.jsx";

import { generateGroups, downloadGroupsPdf } from "../services/api.js";
import { validateForm } from "../utils/validation.js";

const EMPTY_ROW = {
  name: "",
  dob: "",
};

export default function Home() {
  // =========================================================
  // STATE
  // =========================================================

  const [inputMethod, setInputMethod] = useState("manual");

  const [manualStudents, setManualStudents] = useState([{ ...EMPTY_ROW }]);

  const [excelStudents, setExcelStudents] = useState([]);

  const [numberOfGroups, setNumberOfGroups] = useState(2);

  const [minAge, setMinAge] = useState(null);

  const [maxAge, setMaxAge] = useState(null);

  const [errors, setErrors] = useState([]);

  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);

  /*
   * PDF report title.
   *
   * This is shown in the PDF options popup and can be
   * changed before every PDF is generated.
   */
  const [pdfTitle, setPdfTitle] = useState("Zoo Club 2026 - 2027");

  /*
   * PDF fields.
   *
   * Student Name is selected by default.
   */
  const [pdfFields, setPdfFields] = useState({
    name: true,
    dob: false,
    age: false,
  });

  const [showPdfOptions, setShowPdfOptions] = useState(false);

  const [result, setResult] = useState(null);

  // Students excluded because of the selected age criteria.
  const [excludedStudents, setExcludedStudents] = useState([]);

  // =========================================================
  // ACTIVE STUDENTS
  // =========================================================

  const activeStudents =
    inputMethod === "manual" ? manualStudents : excelStudents;

  const nonEmptyStudents = activeStudents.filter(
    (student) =>
      student &&
      (String(student.name || "").trim() !== "" ||
        String(student.dob || "").trim() !== ""),
  );

  // =========================================================
  // INPUT METHOD
  // =========================================================

  function handleInputMethodChange(method) {
    setInputMethod(method);

    setResult(null);
    setErrors([]);
    setExcludedStudents([]);
    setShowValidationErrors(false);
  }

  // =========================================================
  // EXCEL
  // =========================================================

  function handleExcelParsed(students) {
    /*
     * IMPORTANT:
     * The Excel parser is already returning the students correctly.
     * We must store them in Home state.
     */

    const importedStudents = Array.isArray(students) ? students : [];

    console.log("HOME RECEIVED EXCEL STUDENTS:", importedStudents);

    console.log("HOME EXCEL STUDENT COUNT:", importedStudents.length);

    setExcelStudents(importedStudents);

    setResult(null);
    setErrors([]);
    setExcludedStudents([]);
    setShowValidationErrors(false);
  }

  // =========================================================
  // GROUP COUNT VALIDATION
  // =========================================================

  function validateGroupCount(studentCount, groupCount) {
    const problems = [];

    if (!Number.isInteger(groupCount) || groupCount < 1) {
      problems.push("Number of groups must be a whole number of at least 1.");

      return problems;
    }

    if (studentCount > 0 && groupCount > studentCount) {
      problems.push(
        `Cannot create ${groupCount} groups with only ${studentCount} students. Please enter at least ${groupCount} students or reduce the number of groups.`,
      );
    }

    return problems;
  }

  // =========================================================
  // GENERATE GROUPS
  // =========================================================

  async function handleGenerate(confirmExclusions = false) {
    /*
     * Show field validation only after the user presses
     * Generate Groups.
     */

    setShowValidationErrors(true);

    const studentCount = nonEmptyStudents.length;

    const groupCount = Number(numberOfGroups);

    const formProblems = validateForm(activeStudents, groupCount);

    const groupProblems = validateGroupCount(studentCount, groupCount);

    const validationProblems = [...formProblems, ...groupProblems];

    /*
     * Stop if basic form validation fails.
     */

    if (validationProblems.length > 0) {
      setErrors(validationProblems);
      setExcludedStudents([]);
      setResult(null);

      return;
    }

    /*
     * Clear previous errors.
     */

    setErrors([]);

    setIsGenerating(true);

    try {
      const data = await generateGroups(
        nonEmptyStudents,
        groupCount,
        minAge,
        maxAge,
        confirmExclusions,
      );

      /*
       * Successful generation.
       */

      setResult(data);

      setExcludedStudents(
        Array.isArray(data.excludedStudents) ? data.excludedStudents : [],
      );
    } catch (err) {
      /*
       * Age filtering requires confirmation.
       *
       * Backend returns:
       *
       * {
       *   requiresConfirmation: true,
       *   excludedStudents: [...]
       * }
       */

      if (err.requiresConfirmation) {
        setExcludedStudents(
          Array.isArray(err.excludedStudents) ? err.excludedStudents : [],
        );

        setErrors([]);
        setResult(null);

        return;
      }

      /*
       * Normal validation/application error.
       */

      setErrors(err.details || [err.message || "Unable to generate groups."]);

      setExcludedStudents([]);
      setResult(null);
    } finally {
      setIsGenerating(false);
    }
  }

  // =========================================================
  // PDF DOWNLOAD OPTIONS
  // =========================================================

  function openPdfOptions() {
    setErrors([]);
    setShowPdfOptions(true);
  }

  function closePdfOptions() {
    if (!isDownloading) {
      setShowPdfOptions(false);
    }
  }

  function togglePdfField(field) {
    setPdfFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  // =========================================================
  // DOWNLOAD PDF
  // =========================================================

  async function handleDownloadPdf() {
    const title = pdfTitle.trim();

    /*
     * Make sure the user entered a title.
     */

    if (!title) {
      setErrors(["Please enter a report title."]);
      return;
    }

    /*
     * Find which student fields were selected.
     */

    const include = Object.entries(pdfFields)
      .filter(([, selected]) => selected)
      .map(([field]) => field);

    /*
     * At least one field must be selected.
     */

    if (include.length === 0) {
      setErrors(["Please select at least one student field for the PDF."]);

      return;
    }

    setIsDownloading(true);

    try {
      await downloadGroupsPdf(
        nonEmptyStudents,
        Number(numberOfGroups),
        include,
        title,
      );

      /*
       * Close the popup after successful generation.
       */

      setShowPdfOptions(false);
    } catch (err) {
      setErrors(err.details || [err.message || "Unable to download the PDF."]);
    } finally {
      setIsDownloading(false);
    }
  }

  // =========================================================
  // RETURN
  // =========================================================

  return (
    <div className="zoo-page relative min-h-screen overflow-hidden">
      {/*
       * Everything inside this wrapper sits above the
       * very-light wildlife/tiger background.
       */}

      <div className="relative z-10">
        {/* =================================================
            HEADER
        ================================================= */}

        <Header />

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
          {/* =================================================
              PAGE INTRO
          ================================================= */}

          <div className="mb-7">
            <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-forest-600">
              Zoo Club
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-forest-900 sm:text-4xl lg:text-[42px]">
              Student Group Allocation
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 sm:text-base">
              Organize Zoo Club students into balanced groups using age-aware
              allocation and flexible roster management.
            </p>
          </div>

          {/* =================================================
              GROUP CONFIGURATION
          ================================================= */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgba(32,80,45,0.06)]">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-forest-900">
                    Group Configuration
                  </h3>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Set the number of groups and optional age criteria.
                  </p>
                </div>

                <span className="hidden rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-700 sm:block">
                  Step 1
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <GroupConfiguration
                totalStudents={nonEmptyStudents.length}
                numberOfGroups={numberOfGroups}
                onNumberOfGroupsChange={setNumberOfGroups}
                minAge={minAge}
                maxAge={maxAge}
                onMinAgeChange={setMinAge}
                onMaxAgeChange={setMaxAge}
              />
            </div>
          </section>

          {/* =================================================
              STUDENT ROSTER
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgba(32,80,45,0.06)]">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-forest-900">
                    Student Roster
                  </h3>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Enter students manually or import them from Excel.
                  </p>
                </div>

                <span className="hidden rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-700 sm:block">
                  Step 2
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* =================================================
                  INPUT METHOD TABS
              ================================================= */}

              <div className="mb-5 grid grid-cols-2 rounded-xl bg-forest-50 p-1">
                <button
                  type="button"
                  onClick={() => handleInputMethodChange("manual")}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    inputMethod === "manual"
                      ? "bg-white text-forest-700 shadow-sm"
                      : "text-gray-500 hover:text-forest-700"
                  }`}
                >
                  Manual Entry
                </button>

                <button
                  type="button"
                  onClick={() => handleInputMethodChange("excel")}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    inputMethod === "excel"
                      ? "bg-white text-forest-700 shadow-sm"
                      : "text-gray-500 hover:text-forest-700"
                  }`}
                >
                  Excel Upload
                </button>
              </div>

              {/* =================================================
                  MANUAL / EXCEL
              ================================================= */}

              {inputMethod === "manual" ? (
                <StudentForm
                  students={manualStudents}
                  onChange={setManualStudents}
                  showValidationErrors={showValidationErrors}
                />
              ) : (
                <div className="space-y-4">
                  <ExcelUpload onParsed={handleExcelParsed} />

                  {excelStudents.length > 0 ? (
                    <StudentTable students={excelStudents} />
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
                      <p className="text-sm font-medium text-gray-500">
                        No students imported yet.
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        Upload an Excel file to preview the roster.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              ERRORS
          ================================================= */}

          {errors.length > 0 && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
                  !
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    Please check the following
                  </p>

                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {errors.map((message, index) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              GENERATE BUTTON
          ================================================= */}

          <div className="mt-7">
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60 sm:mx-auto sm:w-auto sm:min-w-[240px]"
            >
              {isGenerating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Groups
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>

          {/* =================================================
              RESULT
          ================================================= */}

          {result && (
            <div className="mt-8">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-forest-500" />

                <h3 className="font-semibold text-forest-900">
                  Generated Allocation
                </h3>
              </div>

              <GroupPreview
                result={result}
                onRegenerate={() => handleGenerate(false)}
                onDownloadPdf={openPdfOptions}
                isDownloading={isDownloading}
              />
            </div>
          )}
        </main>

        {/* =====================================================
            PDF DOWNLOAD OPTIONS MODAL
        ===================================================== */}

        {showPdfOptions && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-options-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closePdfOptions();
              }
            }}
          >
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              {/* =================================================
                  MODAL HEADER
              ================================================= */}

              <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3
                      id="pdf-options-title"
                      className="text-lg font-bold text-forest-900"
                    >
                      PDF Download Options
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Customize the report before generating the PDF.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closePdfOptions}
                    disabled={isDownloading}
                    className="rounded-lg p-1 text-xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* =================================================
                  MODAL BODY
              ================================================= */}

              <div className="space-y-5 px-5 py-5 sm:px-6">
                {/* =================================================
                    REPORT TITLE
                ================================================= */}

                <div>
                  <label
                    htmlFor="pdf-title"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Report Title
                  </label>

                  <input
                    id="pdf-title"
                    type="text"
                    value={pdfTitle}
                    onChange={(event) => setPdfTitle(event.target.value)}
                    placeholder="Enter report title"
                    disabled={isDownloading}
                    maxLength={120}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-forest-500 focus:ring-2 focus:ring-forest-100 disabled:bg-gray-100"
                  />

                  <p className="mt-1.5 text-xs text-gray-400">
                    This title will appear in the PDF report.
                  </p>
                </div>

                {/* =================================================
                    PDF FIELDS
                ================================================= */}

                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700">
                    Information to include
                  </p>

                  <div className="space-y-2">
                    {/* STUDENT NAME */}

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition hover:border-forest-200 hover:bg-forest-50/50">
                      <input
                        type="checkbox"
                        checked={pdfFields.name}
                        onChange={() => togglePdfField("name")}
                        disabled={isDownloading}
                        className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500"
                      />

                      <span className="text-sm font-medium text-gray-700">
                        Student Name
                      </span>
                    </label>

                    {/* DATE OF BIRTH */}

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition hover:border-forest-200 hover:bg-forest-50/50">
                      <input
                        type="checkbox"
                        checked={pdfFields.dob}
                        onChange={() => togglePdfField("dob")}
                        disabled={isDownloading}
                        className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500"
                      />

                      <span className="text-sm font-medium text-gray-700">
                        Date of Birth
                      </span>
                    </label>

                    {/* AGE */}

                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition hover:border-forest-200 hover:bg-forest-50/50">
                      <input
                        type="checkbox"
                        checked={pdfFields.age}
                        onChange={() => togglePdfField("age")}
                        disabled={isDownloading}
                        className="h-4 w-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500"
                      />

                      <span className="text-sm font-medium text-gray-700">
                        Age
                      </span>
                    </label>
                  </div>
                </div>

                {/* =================================================
                    INFO
                ================================================= */}

                <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500">
                  <strong>Sl. No.</strong> is always included for easy group
                  reference.
                </div>
              </div>

              {/* =================================================
                  MODAL FOOTER
              ================================================= */}

              <div className="flex gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={closePdfOptions}
                  disabled={isDownloading}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="flex-1 rounded-xl bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDownloading ? "Generating..." : "Generate PDF"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <footer className="mt-10 border-t border-forest-100 bg-white/90">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 px-4 py-5 text-center sm:flex-row sm:px-8 sm:text-left lg:px-12">
            <div>
              <p className="text-xs font-semibold text-forest-700">
                Education Department
              </p>

              <p className="text-[11px] text-gray-400">
                Bannerughatta Biological Park
              </p>
            </div>

            <p className="text-[11px] text-gray-400">
              Student Group Allocation System
            </p>
          </div>
        </footer>
      </div>

      {/* =====================================================
          AGE EXCLUSION CONFIRMATION MODAL
      ===================================================== */}

      {excludedStudents.length > 0 && !result && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}

            <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg">
                  ⚠️
                </div>

                <div>
                  <h3 className="text-lg font-bold text-forest-900">
                    Some students are outside the selected age range
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    These students will not be included in the generated groups.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal body */}

            <div className="max-h-[50vh] overflow-y-auto px-5 py-4 sm:px-6">
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="grid grid-cols-[1fr_auto] bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span>Student</span>
                  <span>Age</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {excludedStudents.map((student, index) => (
                    <div
                      key={`${student.name || "student"}-${student.dob || index}-${index}`}
                      className="grid grid-cols-[1fr_auto] items-center px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {student.name || "Unnamed student"}
                        </p>

                        {student.dob && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            DOB: {student.dob}
                          </p>
                        )}
                      </div>

                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        {student.age ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal actions */}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => {
                  setExcludedStudents([]);
                  setErrors([]);
                }}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setExcludedStudents([]);
                  handleGenerate(true);
                }}
                className="rounded-xl bg-forest-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700"
              >
                Continue & Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
