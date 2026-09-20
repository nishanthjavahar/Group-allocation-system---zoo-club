/**
 * pdfGenerator.js
 *
 * Generates the Zoo Club Student Group Allocation Report
 * as a professional A4 PDF using Puppeteer.
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const { ORGANISATION, LOGO_FILENAME } = require("../config/constants");

/* =========================================================
   CUSTOM ERROR
========================================================= */

class PdfGenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PdfGenerationError";
  }
}

/* =========================================================
   LOGO
========================================================= */

/**
 * Resolve BBP logo.
 *
 * Preferred:
 *
 * zoo-club-group-manager/
 * ├── assets/
 * │   └── bbp-logo.png
 * └── backend/
 *     └── src/
 *         └── services/
 *             └── pdfGenerator.js
 *
 * backend/assets is also checked as fallback.
 */
function resolveLogoPath() {
  const candidates = [
    // Project root /assets
    path.join(__dirname, "..", "..", "..", "assets", LOGO_FILENAME),

    // backend/assets
    path.join(__dirname, "..", "..", "assets", LOGO_FILENAME),
  ];

  const existingPath = candidates.find((filePath) => fs.existsSync(filePath));

  return existingPath || candidates[0];
}

/**
 * Convert logo to Base64 data URI.
 *
 * This prevents Puppeteer from having to resolve
 * a local filesystem path inside the PDF header.
 */
function loadLogoAsDataUri() {
  const logoPath = resolveLogoPath();

  if (!fs.existsSync(logoPath)) {
    console.warn("BBP logo not found at:", logoPath);
    return null;
  }

  try {
    const buffer = fs.readFileSync(logoPath);

    const extension = path.extname(logoPath).replace(".", "").toLowerCase();

    let mimeType = "image/png";

    if (extension === "jpg" || extension === "jpeg") {
      mimeType = "image/jpeg";
    } else if (extension === "webp") {
      mimeType = "image/webp";
    } else if (extension === "svg") {
      mimeType = "image/svg+xml";
    }

    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("Unable to read BBP logo:", error);
    return null;
  }
}

/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatReportDate(date = new Date()) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Sort students:
 *
 * Oldest → youngest
 * Higher age first.
 *
 * Same age → alphabetical name.
 */
function sortStudentsOldestFirst(students) {
  return [...students].sort((a, b) => {
    const ageA = Number(a.age);
    const ageB = Number(b.age);

    if (ageB !== ageA) {
      return ageB - ageA;
    }

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

/* =========================================================
   AGE DISTRIBUTION
========================================================= */

function renderAgeDistributionTable(ageDistribution = []) {
  const rows = [...ageDistribution]
    .sort((a, b) => Number(a.age) - Number(b.age))
    .map(
      ({ age, count }) => `
        <tr>
          <td>${escapeHtml(age)}</td>
          <td>${escapeHtml(count)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <table class="age-distribution-table">

      <thead>
        <tr>
          <th>Age</th>
          <th>Students</th>
        </tr>
      </thead>

      <tbody>
        ${rows}
      </tbody>

    </table>
  `;
}

/* =========================================================
   GROUP TABLE
========================================================= */

function renderGroupTable(group) {
  const students = sortStudentsOldestFirst(group.students || []);

  const rows = students
    .map(
      (student, index) => `
        <tr>

          <td class="serial-number">
            ${index + 1}
          </td>

          <td class="student-name">
            ${escapeHtml(student.name)}
          </td>

          <td>
            ${escapeHtml(student.dobDisplay || student.dob || "")}
          </td>

          <td class="age-cell">
            ${escapeHtml(student.age)}
          </td>

        </tr>
      `,
    )
    .join("");

  return `
    <section class="group-section">

      <div class="group-heading">

        <div class="group-title">
          Group ${escapeHtml(group.groupNumber)}
        </div>

        <div class="group-count">
          ${students.length} students
        </div>

      </div>

      <table class="group-table">

        <thead>
          <tr>

            <th class="sl-column">
              Sl. No.
            </th>

            <th>
              Student Name
            </th>

            <th class="dob-column">
              Date of Birth
            </th>

            <th class="age-column">
              Age
            </th>

          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>

      </table>

    </section>
  `;
}

/* =========================================================
   REPEATING HEADER
========================================================= */

/**
 * This header appears on every page.
 *
 * Layout:
 *
 * [ BIG LOGO ]  BANNERUGHATTA BIOLOGICAL PARK
 *               ZOO CLUB 2026 - 2027
 *               STUDENT GROUP ALLOCATION DETAILS
 *               Generated: 19 September 2026
 *
 * The generated date is intentionally NOT placed
 * at the extreme right.
 */
function buildHeaderTemplate(logoDataUri) {
  const logo = logoDataUri
    ? `
      <img
        src="${logoDataUri}"
        style="
          width:86px;
          height:86px;
          object-fit:contain;
          display:block;
          flex-shrink:0;
          margin-left:16px;
        "
      />
    `
    : `
      <div
        style="
          width:86px;
          height:86px;
          flex-shrink:0;
          margin-left:16px;
        "
      ></div>
    `;

  return `
    <div
      style="
        width:100%;
        height:100px;
        margin:0;
        padding:2px 0 6px 0;

        display:flex;
        align-items:center;

        border-bottom:2px solid #2f6b3a;

        font-family:Arial, Helvetica, sans-serif;
        color:#1f2d1f;
      "
    >

      ${logo}

      <div
        style="
          margin-left:18px;

          display:flex;
          flex-direction:column;
          justify-content:center;

          line-height:1.05;
        "
      >

        <!-- ORGANISATION -->

        <div
          style="
            font-size:15px;
            font-weight:700;
            color:#2f6b3a;

            letter-spacing:0.2px;
          "
        >
          ${escapeHtml(ORGANISATION.name)}
        </div>


        <!-- PROGRAMME -->

        <div
          style="
            font-size:11px;
            font-weight:600;
            color:#555;

            margin-top:4px;
          "
        >
          ${escapeHtml(ORGANISATION.programme)}
        </div>


        <!-- REPORT TITLE -->

        <div
          style="
            font-size:12px;
            font-weight:700;
            color:#1f2d1f;

            margin-top:6px;
          "
        >
          ${escapeHtml(ORGANISATION.reportTitle)}
        </div>


        <!-- GENERATED DATE -->

        <div
          style="
            font-size:8.5px;
            color:#666;

            margin-top:5px;
          "
        >
          <strong>Generated:</strong>
          ${formatReportDate()}
        </div>

      </div>

    </div>
  `;
}

/* =========================================================
   FOOTER
========================================================= */

function buildFooterTemplate() {
  return `
    <div
      style="
        width:100%;

        padding-top:4px;

        border-top:1px solid #d9ded9;

        font-family:Arial, Helvetica, sans-serif;

        font-size:8px;

        color:#777;

        text-align:center;
      "
    >

      <span>
        ${escapeHtml(ORGANISATION.name)}
        &nbsp;&middot;&nbsp;
        ${escapeHtml(ORGANISATION.programme)}
      </span>

      &nbsp;&nbsp;|&nbsp;&nbsp;

      Page
      <span class="pageNumber"></span>
      of
      <span class="totalPages"></span>

    </div>
  `;
}

/* =========================================================
   REPORT HTML
========================================================= */

function buildReportHtml(data) {
  const { groups = [], ageDistribution = [], summary = {} } = data;

  const logoDataUri = loadLogoAsDataUri();

  const totalStudents = Number(summary.totalStudents ?? 0);

  const numberOfGroups = Number(summary.numberOfGroups ?? groups.length ?? 0);

  const averagePerGroup =
    numberOfGroups > 0 ? (totalStudents / numberOfGroups).toFixed(1) : "0.0";

  /**
   * Hidden logo ensures Chromium has already
   * processed the data URI.
   */
  const hiddenLogo = logoDataUri
    ? `
      <img
        src="${logoDataUri}"
        alt=""
        style="
          position:absolute;
          width:1px;
          height:1px;
          opacity:0.01;
          pointer-events:none;
        "
      />
    `
    : "";

  return `
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>
  ${escapeHtml(ORGANISATION.reportTitle)}
</title>


<style>

/* =========================================================
   PAGE
========================================================= */

@page {
  size:A4;

  /*
   * This must be large enough to reserve space
   * for the Puppeteer repeating header.
   */
  margin:
    38mm
    15mm
    18mm
    15mm;
}


* {
  box-sizing:border-box;
}


html,
body {
  margin:0;
  padding:0;
}


body {
  font-family:
    "Segoe UI",
    Arial,
    Helvetica,
    sans-serif;

  color:#1f2d1f;

  font-size:10pt;

  line-height:1.4;
}


/* =========================================================
   SUMMARY
========================================================= */

.summary-grid {

  display:flex;

  align-items:center;

  gap:0;

  width:100%;

  background:#f2f7f2;

  border:
    1px solid #d5e3d5;

  border-radius:7px;

  overflow:hidden;

  /*
   * IMPORTANT:
   * Keeps the summary box clearly below
   * the repeating header line.
   */
  margin-top:10px;

  margin-bottom:18px;
}


.summary-item {

  flex:1;

  padding:10px 12px;

  font-size:9.7pt;

  text-align:center;

  border-right:
    1px solid #d5e3d5;
}


.summary-item:last-child {
  border-right:none;
}


.summary-label {

  display:block;

  color:#666;

  font-size:8.5pt;

  margin-bottom:2px;
}


.summary-value {

  display:block;

  color:#2f6b3a;

  font-size:12pt;

  font-weight:800;
}


/* =========================================================
   SECTION HEADINGS
========================================================= */

.section-heading {

  display:flex;

  align-items:center;

  gap:10px;

  margin:
    18px 0
    8px;

  color:#2f6b3a;

  font-size:11.5pt;

  font-weight:800;
}


.section-heading::after {

  content:"";

  height:1px;

  flex:1;

  background:#d9e3d9;
}


/* =========================================================
   TABLES
========================================================= */

table {

  width:100%;

  border-collapse:collapse;

  border-spacing:0;
}


thead {
  display:table-header-group;
}


tbody {
  display:table-row-group;
}


tr {

  break-inside:avoid;

  page-break-inside:avoid;
}


th {

  background:#2f6b3a;

  color:#ffffff;

  font-size:9pt;

  font-weight:700;

  padding:
    6px
    8px;

  border:
    1px solid #2f6b3a;

  text-align:left;
}


td {

  font-size:9pt;

  padding:
    5px
    8px;

  border:
    1px solid #d0d8d0;

  color:#293229;
}


tbody tr:nth-child(even) td {
  background:#f7faf7;
}


/* =========================================================
   AGE DISTRIBUTION
========================================================= */

.age-distribution-table {

  width:280px;

  margin-bottom:16px;
}


.age-distribution-table th,
.age-distribution-table td {
  text-align:left;
}


.age-distribution-table th:first-child,
.age-distribution-table td:first-child {
  width:50%;
}


/* =========================================================
   GROUPS
========================================================= */

.group-section {

  break-inside:avoid;

  page-break-inside:avoid;

  margin-bottom:17px;
}


.group-heading {

  display:flex;

  align-items:baseline;

  gap:7px;

  /*
   * Adds a little breathing room above
   * every Group heading.
   */
  margin-top:7px;

  margin-bottom:5px;

  break-after:avoid;

  page-break-after:avoid;
}


.group-title {

  font-size:11pt;

  font-weight:800;

  color:#1f2d1f;
}


.group-count {

  font-size:9pt;

  color:#777;
}


.group-table {
  width:100%;
}


.group-table th,
.group-table td {
  vertical-align:middle;
}


.sl-column {
  width:12%;
}


.student-name {

  width:40%;

  font-weight:500;
}


.dob-column {
  width:33%;
}


.age-column {
  width:15%;
}


.serial-number {
  text-align:center;
}


.age-cell {

  text-align:center;

  font-weight:600;
}


/* =========================================================
   PREVENT BAD BREAKS
========================================================= */

.group-section table {
  break-inside:auto;
}


.group-section thead {
  break-inside:avoid;
}


/*
 * Keep Group heading together with its table.
 */
.group-heading {
  break-inside:avoid;
}


/* =========================================================
   PRINT
========================================================= */

@media print {

  body {

    -webkit-print-color-adjust:exact;

    print-color-adjust:exact;
  }

}

</style>

</head>


<body>

${hiddenLogo}


<!-- =======================================================
     SUMMARY
======================================================== -->

<div class="summary-grid">

  <div class="summary-item">

    <span class="summary-label">
      Total Students
    </span>

    <span class="summary-value">
      ${totalStudents}
    </span>

  </div>


  <div class="summary-item">

    <span class="summary-label">
      Total Groups
    </span>

    <span class="summary-value">
      ${numberOfGroups}
    </span>

  </div>


  <div class="summary-item">

    <span class="summary-label">
      Average per Group
    </span>

    <span class="summary-value">
      ${averagePerGroup}
    </span>

  </div>

</div>


<!-- =======================================================
     AGE DISTRIBUTION
======================================================== -->

<h2 class="section-heading">
  <span>Age Distribution</span>
</h2>

${renderAgeDistributionTable(ageDistribution)}


<!-- =======================================================
     GROUP ALLOCATION
======================================================== -->

<h2 class="section-heading">
  <span>Group Allocation</span>
</h2>

${groups.map(renderGroupTable).join("")}


</body>

</html>
`;
}

/* =========================================================
   GENERATE PDF
========================================================= */

async function generateGroupAllocationPdf(data) {
  const html = buildReportHtml(data);

  const logoDataUri = loadLogoAsDataUri();

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 1240,

      height: 1754,

      deviceScaleFactor: 1,
    });

    await page.setContent(html, {
      waitUntil: "load",
    });

    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });

    /* =====================================================
       HEADER / FOOTER
    ===================================================== */

    const headerTemplate = buildHeaderTemplate(logoDataUri);

    const footerTemplate = buildFooterTemplate();

    /* =====================================================
       PDF
    ===================================================== */

    const pdfBuffer = await page.pdf({
      format: "A4",

      printBackground: true,

      displayHeaderFooter: true,

      headerTemplate,

      footerTemplate,

      /*
       * IMPORTANT
       *
       * 38mm gives enough reserved space
       * for the 100px repeating header.
       *
       * This prevents:
       *
       * Group 2
       * Group 3
       * Group 4
       * Group 5
       *
       * from touching or going behind
       * the header line.
       */
      margin: {
        top: "38mm",
        bottom: "18mm",
        left: "15mm",
        right: "15mm",
      },

      preferCSSPageSize: false,
    });

    return pdfBuffer;
  } catch (error) {
    console.error("PDF generation error:", error);

    throw new PdfGenerationError(
      "Unable to generate the PDF. Please try again.",
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  PdfGenerationError,

  resolveLogoPath,

  loadLogoAsDataUri,

  buildReportHtml,

  generateGroupAllocationPdf,
};
