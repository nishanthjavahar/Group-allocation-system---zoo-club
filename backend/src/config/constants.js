/**
 * Central configuration for the Zoo Club Student Group Allocation System.
 *
 * Every tunable value lives here so that a coordinator (or a future developer)
 * can change the rules in ONE place instead of hunting through the codebase.
 */

/** Zoo Club membership age range, in completed years. */
/**
 * Optional Zoo Club membership age range.
 *
 * null means there is no age restriction by default.
 * The actual minimum/maximum age is selected by the coordinator
 * in the frontend and passed to the backend when groups are generated.
 */
const MIN_AGE = null;
const MAX_AGE = null;

/** Group configuration limits. */
const MIN_GROUPS = 1;

/**
 * Sanity bound on a date of birth. Anything older than this is almost
 * certainly a typo (or an Excel serial number misread as a year).
 */
const MAX_REASONABLE_AGE = 120;

/** Organisation details used by the UI header and the PDF report. */
const ORGANISATION = {
  name: "BANNERUGHATTA BIOLOGICAL PARK",

  programme: "Group Allocation System",

  reportTitle: "GROUP ALLOCATION DETAILS",
};

/** Logo file name. The same file is used by the website and the PDF. */
const LOGO_FILENAME = "bbp-logo.png";

module.exports = {
  MIN_AGE,
  MAX_AGE,
  MIN_GROUPS,
  MAX_REASONABLE_AGE,
  ORGANISATION,
  LOGO_FILENAME,
};
