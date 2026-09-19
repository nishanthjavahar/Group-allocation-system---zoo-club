# Zoo Club Student Group Allocation System

A web application for the Education Department of a biological park / zoo to
automatically divide registered Zoo Club students into balanced groups based
on age, and export the result as a professional PDF report.

---

## 1. Overview

Coordinators enter students (typed in by hand, or uploaded from an Excel
file), pick how many groups they need, and the system:

1. Calculates each student's exact current age from their date of birth.
2. Groups students of the same age together, then spreads each age group
   evenly across the requested number of groups.
3. Balances total group sizes so no group is more than one student larger
   than any other.
4. Shows a preview of every group, plus an age distribution summary.
5. Generates a print-ready PDF report carrying the same logo and layout,
   with page numbers, for the coordinator to file or hand to volunteers.

The same allocation is reproducible: running it twice on the same roster
produces the same groups, every time.

---

## 2. Features

- Manual student entry (add/remove rows) or `.xlsx` / `.xls` upload
- Accurate age calculation (not `currentYear − birthYear`)
- Deterministic, evenly-balanced group allocation, including balancing
  same-age students across groups
- Age distribution summary with a simple inline bar visualisation
- Group preview as cards, with a Regenerate action
- Professional multi-page A4 PDF export via Puppeteer, with the official
  logo on every page and page numbers in the footer
- Frontend and backend validation, with backend as the final authority
- Configurable Zoo Club age range (`MIN_AGE` / `MAX_AGE`)
- No database required; structured so one can be added later without
  touching the allocation algorithm

---

## 3. Tech Stack

| Layer     | Technology                          |
|-----------|--------------------------------------|
| Frontend  | React + Vite + Tailwind CSS          |
| Backend   | Node.js + Express                    |
| Excel I/O | `xlsx`                               |
| PDF       | Puppeteer                            |
| Database  | None (in-memory request/response only) |

---

## 4. Architecture

```
Browser (React SPA)
   │  fetch /api/...
   ▼
Express API (backend/server.js)
   │
   ├─ routes/groupRoutes.js        HTTP routing + file upload handling (multer)
   ├─ controllers/                 request/response shaping only
   │    groupController.js         generate groups, parse Excel
   │    pdfController.js           generate + stream the PDF
   │    errorHandling.js           shared error → HTTP response mapping
   │
   └─ services/                    all business logic, framework-agnostic
        ageCalculator.js           DOB parsing + accurate age calculation
        groupAllocator.js          the balanced allocation algorithm
        excelParser.js             .xlsx/.xls → raw student records
        pdfGenerator.js            HTML report → Puppeteer → PDF buffer
```

Every service is a plain Node module with no Express dependency, so it can
be unit tested directly (see `backend/tests/`) and reused later — for
example from a CLI script, a scheduled job, or a different framework —
without any changes.

### Why no database (yet)

The spec asks for a v1 that works without MongoDB/PostgreSQL. Every request
is self-contained: the frontend sends the full roster and group count, the
backend computes and returns the result, and nothing is persisted server-side.
To add a database later:

- Add a `models/` (or `repositories/`) folder in `backend/src/`.
- Add a `POST /api/batches` (save) and `GET /api/batches/:id` (load) pair of
  routes/controllers that wrap the existing `groupAllocator` output.
- The algorithm itself needs no changes — it already takes and returns plain
  JSON-serialisable data.

---

## 5. Folder Structure

```
zoo-club-group-manager/
├── README.md
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── public/
│   │   └── assets/
│   │       └── bbp-logo.png        ← replace with the real logo
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── StudentForm.jsx
│       │   ├── StudentTable.jsx
│       │   ├── ExcelUpload.jsx
│       │   ├── GroupConfiguration.jsx
│       │   ├── GroupPreview.jsx
│       │   ├── GroupCard.jsx
│       │   └── AgeDistribution.jsx
│       ├── pages/
│       │   └── Home.jsx
│       ├── services/
│       │   └── api.js
│       └── utils/
│           └── validation.js
└── backend/
    ├── package.json
    ├── server.js
    ├── assets/
    │   └── bbp-logo.png            ← replace with the real logo (same file)
    ├── src/
    │   ├── config/
    │   │   └── constants.js
    │   ├── controllers/
    │   │   ├── groupController.js
    │   │   ├── pdfController.js
    │   │   └── errorHandling.js
    │   ├── routes/
    │   │   └── groupRoutes.js
    │   ├── services/
    │   │   ├── ageCalculator.js
    │   │   ├── groupAllocator.js
    │   │   ├── excelParser.js
    │   │   └── pdfGenerator.js
    │   └── utils/
    │       └── validation.js
    └── tests/
        ├── ageCalculator.test.js
        ├── groupAllocator.test.js
        └── validation.test.js
```

---

## 6. Installation

Requires **Node.js 18+**.

```bash
# 1. Backend
cd backend
npm install
npm test        # optional but recommended: runs 46 unit tests
npm start        # http://localhost:4000

# 2. Frontend (in a second terminal)
cd frontend
npm install
npm run dev      # http://localhost:5173
```

The frontend dev server proxies `/api/*` requests to `http://localhost:4000`
(see `frontend/vite.config.js`), so both must be running together during
development.

For a production build:

```bash
cd frontend
npm run build     # outputs static files to frontend/dist/
```

Serve `frontend/dist/` with any static file host, and point it at your
deployed backend (adjust the API base URL in `frontend/src/services/api.js`
if the backend is not on the same origin).

> **Note on this delivery:** this environment has no internet access, so
> `npm install` could not be run here to fetch Express, React, `xlsx`, or
> Puppeteer. Every line of code was written by hand against each package's
> documented API. The parts with **zero external dependencies** — date/age
> logic and the allocation algorithm — were fully unit tested here (46
> passing tests). Run `npm install` locally before first use so the
> Express/Puppeteer/xlsx-dependent code (routes, Excel parsing, PDF
> generation) can be exercised end-to-end; it's good practice to run
> `npm test` again afterwards too.

---

## 7. Excel Upload Format

The uploaded file must have a header row with these two columns (case
insensitive; "Student Name" and "DOB" are also accepted):

| Name          | Date of Birth |
|---------------|---------------|
| Rahul Kumar   | 12/05/2014    |
| Ananya Sharma | 21/08/2013    |
| Arjun Kumar   | 02/01/2015    |

Dates can be real Excel date cells, or text in `DD/MM/YYYY` or `YYYY-MM-DD`
format. Completely blank rows are skipped silently; rows with only one of
the two fields filled in are reported as errors, never dropped silently.

The parser is a structural check only (right columns, non-empty sheet). Once
parsed, rows go through the exact same validation as manually-typed rows —
missing/invalid/future dates of birth, out-of-range ages, and duplicates are
all caught by `backend/src/utils/validation.js`, the same file that checks
manual entries.

---

## 8. Group Allocation Algorithm

Implemented in `backend/src/services/groupAllocator.js`. In order:

1. **Bucket by age.** Every student is placed into a bucket keyed by their
   calculated age.
2. **Order buckets largest-first.** Bigger buckets are handled before
   smaller ones, since they have the most potential to unbalance a group if
   mishandled; ties are broken by age ascending purely for a predictable,
   readable order.
3. **Round-robin distribution.** Each bucket's students are handed out to
   the groups one at a time, wrapping back to group 1 after the last group.
   This is what spreads same-age students across groups instead of letting
   them cluster.
4. **Rotate the starting group between buckets.** Without this, whichever
   groups happen to sit first in the list would receive the "extra" student
   from every bucket's remainder. Rotating the start index means that
   advantage moves around instead of always favouring the same groups.
5. **Balance total group sizes.** After every bucket is placed, total group
   sizes can still differ by more than one student (this happens when
   several buckets' remainders land on the same groups). A short pass moves
   single students, one at a time, from the largest group to the smallest,
   until no two groups differ by more than one. Each move takes the
   *most duplicated age within the source group*, so a group never loses its
   only student of some age purely to satisfy the size balance.
6. **Validate the result** before returning it: output count must equal
   input count, every student must appear in exactly one group, the number
   of groups must match the request, and group sizes must be balanced to
   within one student. Any violation throws rather than silently returning
   a bad allocation — this is defensive programming; the algorithm above is
   designed never to trigger it, and the unit tests confirm that.

No randomness is used anywhere in this file, so **Regenerate Groups**
currently re-runs the exact same deterministic algorithm on the same input
(this is intentional — see spec section 12). A future "shuffle" option could
be added by seeding a different, explicit starting rotation.

---

## 9. PDF Generation

`backend/src/services/pdfGenerator.js` builds a full HTML document (inline
CSS, A4 page size, tables for each group) and renders it to PDF using
Puppeteer's headless Chromium.

**Logo handling** is the one subtle part: Puppeteer loads the HTML from a
`data:` URL with no folder of its own, so a relative image path like
`assets/bbp-logo.png` would not resolve inside the browser no matter what
directory the Node process was started from. Instead, the logo file is read
from disk with `fs.readFileSync`, resolved via `__dirname` (which always
points at this file's own location, unlike `process.cwd()`), and inlined
directly into the `<img src="data:image/png;base64,...">` tag. There is
nothing left for the browser to fail to find, and this was verified to work
correctly even when the process is launched from a different working
directory (see `backend/tests/` notes for how this was checked before
Puppeteer itself could be installed in this environment).

Page numbers are added via Puppeteer's `headerTemplate`/`footerTemplate`
options in `page.pdf()`, so they appear automatically on every page of a
multi-page report.

---

## 10. Logo Setup

A placeholder logo (a simple green tree emblem) ships in both required
locations so the application runs out of the box:

- `frontend/public/assets/bbp-logo.png` — used by the website
- `backend/assets/bbp-logo.png` — used by the PDF generator

**Replace both files with the real Bannerghatta Biological Park logo**
(same filename, `bbp-logo.png`, in both places) before deploying. No code
changes are needed — both the frontend and the PDF generator always load
whatever file is at that path.

---

## 11. Testing

```bash
cd backend
npm test
```

46 tests across three files, using Node's built-in test runner (no test
framework dependency needed):

- **`ageCalculator.test.js`** (18 tests) — date parsing in multiple formats,
  the exact spec example (DOB 20/12/2014 turning 12 on the birthday), leap
  years, timezone independence (checked by re-running age calculations in
  child processes under `UTC`, `Asia/Kolkata`, `Pacific/Kiritimati`, and
  `America/Los_Angeles`), future-date rejection, and the configurable age
  range.
- **`groupAllocator.test.js`** (18 tests) — every case listed in the spec's
  testing section: 10/2, 60/6 (the worked example), 61/6 (uneven remainder),
  a single age group, multiple age groups, uneven age distributions, more
  groups than students, duplicate students, minimum/maximum age students, a
  600-student/20-group dataset, determinism, and explicit no-student-lost /
  no-student-duplicated checks — plus direct tests of the algorithm's
  internal steps (bucket ordering, round-robin rotation, size balancing).
- **`validation.test.js`** (10 tests) — collecting every row error in one
  pass rather than stopping at the first, age-range rejection, duplicate
  detection (case-insensitive name + same DOB), and future-date handling.

Every allocation test checks, at minimum: `input student count === output
student count` and `every student occurs exactly once` — the two
invariants the spec calls out as non-negotiable.

---

## 12. Future Enhancements

Not implemented now, but the architecture (stateless services, plain-JSON
inputs/outputs, no framework coupling) is meant to make these additive:

- PostgreSQL/MongoDB persistence for Zoo Club batches
- Saving and reloading previous batches
- Admin login / authentication
- Multiple concurrent Zoo Club sessions
- Named groups instead of "Group 1, Group 2..."
- Volunteer assignment per group
- Attendance tracking
- Export roster back to Excel
- Student search across saved batches
- Historical reports

---

## 13. Engineering Notes

- Business logic lives entirely in `backend/src/services/`; controllers only
  parse requests and shape responses.
- Every configurable rule (age range, minimum groups) lives in
  `backend/src/config/constants.js`, not scattered through the codebase.
- The backend never trusts the frontend: `validateGenerateRequest` reruns on
  every request regardless of what the browser already checked.
- No raw stack trace is ever sent to the client; `errorHandling.js` maps
  every known error type to a friendly message and logs the original error
  server-side for debugging.
