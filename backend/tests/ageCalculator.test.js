const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const {
  DateOfBirthError,
  parseDateOfBirth,
  calculateAge,
  isAgeWithinRange,
  formatDateForDisplay,
  formatDateISO,
  withCalculatedAge,
  today,
} = require('../src/services/ageCalculator');

/** Helper: a fixed "current date" so tests never drift as real time passes. */
const on = (iso) => parseDateOfBirth(iso);

test('parses ISO dates', () => {
  const date = parseDateOfBirth('2014-05-12');
  assert.equal(date.getUTCFullYear(), 2014);
  assert.equal(date.getUTCMonth() + 1, 5);
  assert.equal(date.getUTCDate(), 12);
});

test('parses DD/MM/YYYY as day-first, not month-first', () => {
  const date = parseDateOfBirth('05/12/2014');
  assert.equal(date.getUTCDate(), 5);
  assert.equal(date.getUTCMonth() + 1, 12);
});

test('parses DD-MM-YYYY and Date objects', () => {
  assert.equal(formatDateISO('21-08-2013'), '2013-08-21');
  assert.equal(formatDateISO(new Date(Date.UTC(2015, 0, 2))), '2015-01-02');
});

test('reads local-midnight Dates as the day the caller meant', () => {
  // Regression: new Date(2014, 4, 12) is 12 May locally but 11 May in UTC for
  // anyone east of Greenwich. The calendar day the caller wrote must win.
  assert.equal(formatDateISO(new Date(2014, 4, 12)), '2014-05-12');
  // ...while UTC-midnight Dates (what the xlsx package produces) are unchanged.
  assert.equal(formatDateISO(new Date(Date.UTC(2014, 4, 12))), '2014-05-12');
});

test('rejects missing, blank and unparseable dates of birth', () => {
  for (const bad of [null, undefined, '', '  ', 'not a date', '2014/13', '12.05.2014']) {
    assert.throws(() => parseDateOfBirth(bad), DateOfBirthError, `expected rejection for ${bad}`);
  }
});

test('rejects dates that do not exist on the calendar', () => {
  assert.throws(() => parseDateOfBirth('31/02/2014'), DateOfBirthError);
  assert.throws(() => parseDateOfBirth('29/02/2015'), DateOfBirthError); // 2015 is not a leap year
  assert.doesNotThrow(() => parseDateOfBirth('29/02/2016')); // 2016 is
});

test('does NOT use currentYear - birthYear: birthday not yet reached', () => {
  // The example from the specification: DOB 20/12/2014.
  assert.equal(calculateAge('20/12/2014', on('2026-12-19')), 11);
  assert.equal(calculateAge('20/12/2014', on('2026-12-20')), 12); // on the birthday
  assert.equal(calculateAge('20/12/2014', on('2026-12-21')), 12);
});

test('age is correct across a full year around the birthday', () => {
  const dob = '12/05/2014';
  assert.equal(calculateAge(dob, on('2026-01-01')), 11);
  assert.equal(calculateAge(dob, on('2026-05-11')), 11);
  assert.equal(calculateAge(dob, on('2026-05-12')), 12);
  assert.equal(calculateAge(dob, on('2026-12-31')), 12);
});

test('age is 0 on the day of birth', () => {
  assert.equal(calculateAge('2026-09-19', on('2026-09-19')), 0);
});

test('leap-day births turn a year older on 1 March in non-leap years', () => {
  assert.equal(calculateAge('29/02/2016', on('2026-02-28')), 9);
  assert.equal(calculateAge('29/02/2016', on('2026-03-01')), 10);
  // ...and on 29 February itself in leap years.
  assert.equal(calculateAge('29/02/2016', on('2028-02-29')), 12);
});

test('rejects a future date of birth', () => {
  assert.throws(
    () => calculateAge('2027-01-01', on('2026-09-19')),
    (error) => error instanceof DateOfBirthError && /future/i.test(error.message)
  );
});

test('rejects an unrealistically old date of birth', () => {
  assert.throws(() => calculateAge('01/01/1850', on('2026-09-19')), DateOfBirthError);
});

test('age is unaffected by the server timezone', () => {
  // Node fixes its timezone at startup, so this must run in child processes.
  // Timezones are chosen to sit either side of UTC (UTC+14 and UTC-8), which is
  // where a naive local-time implementation reports students a day out.
  // The discriminating case is the day BEFORE the birthday: a naive
  // implementation that parses the DOB as UTC but reads it with local getters
  // reports 12 instead of 11 west of Greenwich.
  const script = `
    const { calculateAge } = require('./src/services/ageCalculator');
    const dayBefore = calculateAge('20/12/2014', new Date(2026, 11, 19));
    const onBirthday = calculateAge('20/12/2014', new Date(2026, 11, 20));
    process.stdout.write(dayBefore + ',' + onBirthday);
  `;

  for (const tz of ['UTC', 'Asia/Kolkata', 'Pacific/Kiritimati', 'America/Los_Angeles']) {
    const result = execFileSync(process.execPath, ['-e', script], {
      cwd: `${__dirname}/..`,
      env: { ...process.env, TZ: tz },
      encoding: 'utf8',
    });
    assert.equal(result, '11,12', `wrong age in timezone ${tz}`);
  }
});

test('defaults to the real current date when no reference date is given', () => {
  const age = calculateAge('01/01/2010');
  const expected = calculateAge('01/01/2010', today());
  assert.equal(age, expected);
  assert.ok(Number.isInteger(age) && age > 0);
});

test('checks the configurable Zoo Club age range', () => {
  assert.equal(isAgeWithinRange(10), true); // minimum
  assert.equal(isAgeWithinRange(18), true); // maximum
  assert.equal(isAgeWithinRange(9), false);
  assert.equal(isAgeWithinRange(19), false);
  assert.equal(isAgeWithinRange(12, 12, 14), true);
  assert.equal(isAgeWithinRange(11, 12, 14), false);
});

test('formats dates for display and for the API', () => {
  assert.equal(formatDateForDisplay('2014-05-12'), '12/05/2014');
  assert.equal(formatDateForDisplay('2015-01-02'), '02/01/2015');
  assert.equal(formatDateISO('12/05/2014'), '2014-05-12');
});

test('enriches a student record with age and both date formats', () => {
  const student = withCalculatedAge(
    { name: 'Rahul Kumar', dob: '12/05/2014' },
    on('2026-09-19')
  );
  assert.deepEqual(student, {
    name: 'Rahul Kumar',
    dob: '2014-05-12',
    dobDisplay: '12/05/2014',
    age: 12,
  });
});

test('sample cohort from the specification produces the expected ages', () => {
  const reference = on('2026-09-19');
  const cohort = [
    { name: 'Rahul Kumar', dob: '12/05/2014', expected: 12 },
    { name: 'Ananya Sharma', dob: '21/08/2013', expected: 13 },
    { name: 'Arjun Kumar', dob: '02/01/2015', expected: 11 },
  ];
  for (const { name, dob, expected } of cohort) {
    assert.equal(calculateAge(dob, reference), expected, `wrong age for ${name}`);
  }
});
