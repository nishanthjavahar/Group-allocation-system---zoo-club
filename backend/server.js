/**
 * server.js
 *
 * Application entrypoint. Kept deliberately small: middleware setup, route
 * mounting, a couple of safety nets, and nothing else.
 */

const path = require("path");
const express = require("express");
const cors = require("cors");

const groupRoutes = require("./src/routes/groupRoutes");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api/groups", groupRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Serve the logo directly too, so it can be sanity-checked in a browser at
// /assets/bbp-logo.png without going through the frontend build.
app.use("/assets", express.static(path.join(__dirname, "..", "assets")));

// Catch-all for unknown API routes.
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found.", details: ["Not found."] });
});

// Final safety net: anything that threw synchronously and wasn't caught by a
// controller's own try/catch still gets a clean JSON response instead of an
// HTML stack trace.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Something went wrong on the server. Please try again.",
    details: ["Something went wrong on the server. Please try again."],
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Zoo Club backend listening on http://localhost:${PORT}`);
});

module.exports = app;
