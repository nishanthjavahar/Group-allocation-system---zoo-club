const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const { ORGANISATION, LOGO_FILENAME } = require("../config/constants");

/* =========================================================
   ERROR
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

function resolveLogoPath() {
  const candidates = [
    path.join(__dirname, "..", "..", "..", "assets", LOGO_FILENAME),
    path.join(__dirname, "..", "..", "assets", LOGO_FILENAME),
  ];

  return (
    candidates.find((filePath) => fs.existsSync(filePath)) || candidates[0]
  );
}

function loadLogoAsDataUri() {
  const logoPath = resolveLogoPath();

  if (!fs.existsSync(logoPath)) {
    console.warn("BBP logo not found:", logoPath);
    return null;
  }

  try {
    const buffer = fs.readFileSync(logoPath);

    const extension = path.extname(logoPath).replace(".", "").toLowerCase();

    const mimeTypes = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      svg: "image/svg+xml",
    };

    const mimeType = mimeTypes[extension] || "image/png";

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

function sortStudentsOldestFirst(students = []) {
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

function normalisePdfFields(pdfFields = ["name", "dob", "age"]) {
  const allowedFields = new Set(["name", "dob", "age"]);

  const fields = Array.isArray(pdfFields)
    ? pdfFields.filter((field) => allowedFields.has(field))
    : ["name", "dob", "age"];

  return [...new Set(fields)];
}

function getGroupTableColumns(pdfFields) {
  const selectedDataFields = pdfFields.filter((field) =>
    ["name", "dob", "age"].includes(field),
  );

  /*
   * The serial number occupies 12%.
   *
   * The remaining 88% is dynamically distributed
   * depending on which fields were selected.
   */
  const dataWidths = {
    1: {
      name: "88%",
      dob: "88%",
      age: "88%",
    },

    2: {
      name: "58%",
      dob: "38%",
      age: "30%",
    },

    3: {
      name: "40%",
      dob: "33%",
      age: "15%",
    },
  };

  const widths = dataWidths[selectedDataFields.length] || dataWidths[3];

  const columns = [
    {
      key: "serial",
      label: "Sl. No.",
      className: "sl-column",
      width: "12%",
    },
  ];

  if (pdfFields.includes("name")) {
    columns.push({
      key: "name",
      label: "Student Name",
      className: "student-name-column",
      width: widths.name,
    });
  }

  if (pdfFields.includes("dob")) {
    columns.push({
      key: "dob",
      label: "Date of Birth",
      className: "dob-column",
      width: widths.dob,
    });
  }

  if (pdfFields.includes("age")) {
    columns.push({
      key: "age",
      label: "Age",
      className: "age-column",
      width: widths.age,
    });
  }

  return columns;
}

function renderGroupTable(group, pdfFields) {
  const students = sortStudentsOldestFirst(group.students || []);

  const columns = getGroupTableColumns(pdfFields);

  const rows = students
    .map((student, index) => {
      const cells = columns
        .map((column) => {
          /*
           * Serial number
           */
          if (column.key === "serial") {
            return `
              <td class="serial-number">
                ${index + 1}
              </td>
            `;
          }

          /*
           * Student name
           */
          if (column.key === "name") {
            return `
              <td class="student-name">
                ${escapeHtml(student.name)}
              </td>
            `;
          }

          /*
           * Date of birth
           */
          if (column.key === "dob") {
            return `
              <td>
                ${escapeHtml(student.dobDisplay || student.dob || "")}
              </td>
            `;
          }

          /*
           * Age
           */
          if (column.key === "age") {
            return `
              <td class="age-cell">
                ${escapeHtml(student.age)}
              </td>
            `;
          }

          return "";
        })
        .join("");

      return `
        <tr>
          ${cells}
        </tr>
      `;
    })
    .join("");

  const headers = columns
    .map(
      (column) => `
        <th
          class="${column.className}"
          style="width:${column.width};"
        >
          ${column.label}
        </th>
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
            ${headers}
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
   HEADER
========================================================= */

function buildHeaderTemplate(logoDataUri, title) {
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
        padding:2px 0 6px 0;
        display:flex;
        align-items:center;
        border-bottom:2px solid #2f6b3a;
        font-family:Arial,Helvetica,sans-serif;
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

        <div
          style="
            font-size:12px;
            font-weight:700;
            color:#1f2d1f;
            margin-top:6px;
          "
        >
          ${escapeHtml(title)}
        </div>

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
   PDF FOOTER
========================================================= */

/*
 * Page numbers are added after Puppeteer creates the PDF.
 *
 * This avoids relying on Puppeteer's:
 *   pageNumber
 *   totalPages
 *
 * placeholders, which were rendering as blank.
 */

async function addPdfFooter(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  const pages = pdfDoc.getPages();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fontSize = 6.5;

  const footerColor = rgb(0.47, 0.47, 0.47);

  const lineColor = rgb(0.85, 0.87, 0.85);

  const totalPages = pages.length;

  const organisationName = ORGANISATION.name || "";

  const programme = ORGANISATION.programme || "";

  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];

    const { width } = page.getSize();

    const pageNumber = index + 1;

    const footerText =
      `${organisationName} · ${programme} | ` +
      `Page ${pageNumber} of ${totalPages}`;

    const textWidth = font.widthOfTextAtSize(footerText, fontSize);

    const x = (width - textWidth) / 2;

    /*
     * Bottom footer area.
     * A4 height is approximately 842pt.
     * The PDF already reserves 18mm at the bottom.
     */

    page.drawLine({
      start: {
        x: 42,
        y: 34,
      },
      end: {
        x: width - 42,
        y: 34,
      },
      thickness: 0.6,
      color: lineColor,
    });

    page.drawText(footerText, {
      x,
      y: 20,
      size: fontSize,
      font,
      color: footerColor,
    });
  }

  return Buffer.from(await pdfDoc.save());
}

/* =========================================================
   REPORT HTML
========================================================= */

function buildReportHtml(data) {
  const {
    groups = [],
    ageDistribution = [],
    summary = {},
    pdfFields: rawPdfFields,
    title: rawTitle,
  } = data || {};

  /*
   * Normalise selected PDF fields.
   *
   * IMPORTANT:
   * Do NOT declare pdfFields twice.
   */
  const pdfFields = normalisePdfFields(rawPdfFields);

  /*
   * Use a safe fallback title if one is somehow
   * missing from the request.
   */
  const title =
    typeof rawTitle === "string" && rawTitle.trim()
      ? rawTitle.trim()
      : "Group Allocation Report";

  const totalStudents = Number(summary.totalStudents ?? 0);

  const numberOfGroups = Number(summary.numberOfGroups ?? groups.length ?? 0);

  const averagePerGroup =
    numberOfGroups > 0 ? (totalStudents / numberOfGroups).toFixed(1) : "0.0";

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
          ${escapeHtml(title)}
        </title>

        <style>

          @page {
            size: A4;
            margin: 38mm 15mm 18mm 15mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
          }

          body {
            font-family:
              "Segoe UI",
              Arial,
              Helvetica,
              sans-serif;

            color: #1f2d1f;

            font-size: 10pt;

            line-height: 1.4;
          }

          /* =================================================
             SUMMARY
          ================================================= */

          .summary-grid {
            display: flex;

            width: 100%;

            background: #f2f7f2;

            border: 1px solid #d5e3d5;

            border-radius: 7px;

            overflow: hidden;

            margin: 10px 0 18px;
          }

          .summary-item {
            flex: 1;

            padding: 10px 12px;

            text-align: center;

            border-right: 1px solid #d5e3d5;
          }

          .summary-item:last-child {
            border-right: none;
          }

          .summary-label {
            display: block;

            color: #666;

            font-size: 8.5pt;

            margin-bottom: 2px;
          }

          .summary-value {
            display: block;

            color: #2f6b3a;

            font-size: 12pt;

            font-weight: 800;
          }

          /* =================================================
             SECTION HEADINGS
          ================================================= */

          .section-heading {
            display: flex;

            align-items: center;

            gap: 10px;

            margin: 18px 0 8px;

            color: #2f6b3a;

            font-size: 11.5pt;

            font-weight: 800;
          }

          .section-heading::after {
            content: "";

            height: 1px;

            flex: 1;

            background: #d9e3d9;
          }

          /* =================================================
             TABLES
          ================================================= */

          table {
            width: 100%;

            border-collapse: collapse;

            border-spacing: 0;
          }

          thead {
            display: table-header-group;
          }

          tr {
            break-inside: avoid;

            page-break-inside: avoid;
          }

          th {
            background: #2f6b3a;

            color: #ffffff;

            font-size: 9pt;

            font-weight: 700;

            padding: 6px 8px;

            border: 1px solid #2f6b3a;

            text-align: left;
          }

          td {
            font-size: 9pt;

            padding: 5px 8px;

            border: 1px solid #d0d8d0;

            color: #293229;
          }

          tbody tr:nth-child(even) td {
            background: #f7faf7;
          }

          /* =================================================
             AGE DISTRIBUTION
          ================================================= */

          .age-distribution-table {
            width: 280px;

            margin-bottom: 16px;
          }

          .age-distribution-table th,
          .age-distribution-table td {
            text-align: left;
          }

          .age-distribution-table th:first-child,
          .age-distribution-table td:first-child {
            width: 50%;
          }

          /* =================================================
             GROUPS
          ================================================= */

          /*
           * IMPORTANT:
           * A complete group must stay together.
           */

          .group-section {
            margin-bottom: 17px;

            break-before: auto;

            page-break-before: auto;

            break-inside: avoid;

            page-break-inside: avoid;
          }

          .group-heading {
            display: flex;

            align-items: baseline;

            gap: 7px;

            margin: 7px 0 5px;

            break-inside: avoid;

            page-break-inside: avoid;

            break-after: avoid;

            page-break-after: avoid;
          }

          .group-title {
            font-size: 11pt;

            font-weight: 800;

            color: #1f2d1f;
          }

          .group-count {
            font-size: 9pt;

            color: #777;
          }

          .group-table {
            width: 100%;

            break-inside: avoid;

            page-break-inside: avoid;
          }

          .group-table thead {
            display: table-header-group;
          }

          .group-table tbody {
            break-inside: avoid;

            page-break-inside: avoid;
          }

          .group-table th,
          .group-table td {
            vertical-align: middle;
          }

          .sl-column {
            width: 12%;

            text-align: center;
          }

          .student-name-column {
            width: 40%;
          }

          .student-name {
            font-weight: 500;
          }

          .dob-column {
            width: 33%;
          }

          .age-column {
            width: 15%;

            text-align: center;
          }

          .serial-number {
            text-align: center;
          }

          .age-cell {
            text-align: center;

            font-weight: 600;
          }

          .group-section thead {
            break-inside: avoid;
          }

          /* =================================================
             PRINT
          ================================================= */

          @media print {
            body {
              -webkit-print-color-adjust: exact;

              print-color-adjust: exact;
            }
          }

        </style>

      </head>

      <body>

        <!-- SUMMARY -->

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

        <!-- AGE DISTRIBUTION -->

        ${
          pdfFields.includes("age")
            ? `
              <h2 class="section-heading">
                <span>Age Distribution</span>
              </h2>

              ${renderAgeDistributionTable(ageDistribution)}
            `
            : ""
        }

        <!-- GROUP ALLOCATION -->

        <h2 class="section-heading">
          <span>Group Allocation</span>
        </h2>

        ${groups.map((group) => renderGroupTable(group, pdfFields)).join("")}

      </body>

    </html>
  `;
}

/* =========================================================
   GENERATE PDF
========================================================= */

async function generateGroupAllocationPdf(data) {
  let browser = null;

  try {
    const html = buildReportHtml(data);

    const logoDataUri = loadLogoAsDataUri();

    /*
     * Chromium is supplied by @sparticuz/chromium.
     */

    const executablePath = await chromium.executablePath();

    console.log("Chromium executable:", executablePath);

    browser = await puppeteer.launch({
      executablePath,

      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],

      defaultViewport: chromium.defaultViewport,

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

    if (page.evaluate) {
      await page.evaluate(async () => {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      });
    }

    /*
     * Puppeteer creates the repeating header.
     *
     * IMPORTANT:
     * Pass data.title here so the custom title
     * entered in the frontend appears in the
     * PDF header.
     *
     * Footer is intentionally left blank because
     * page numbers are added reliably afterward
     * using pdf-lib.
     */

    const pdfBuffer = await page.pdf({
      format: "A4",

      printBackground: true,

      displayHeaderFooter: true,

      headerTemplate: buildHeaderTemplate(logoDataUri, data?.title),

      footerTemplate: "<div></div>",

      margin: {
        top: "38mm",
        bottom: "18mm",
        left: "15mm",
        right: "15mm",
      },

      preferCSSPageSize: false,
    });

    /*
     * Add reliable:
     *
     * Page 1 of 3
     * Page 2 of 3
     * Page 3 of 3
     */

    const finalPdf = await addPdfFooter(pdfBuffer);

    return finalPdf;
  } catch (error) {
    console.error("PDF generation error:", error);

    throw new PdfGenerationError(
      "Unable to generate the PDF. Please try again.",
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error("Unable to close Chromium:", error);
      }
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
