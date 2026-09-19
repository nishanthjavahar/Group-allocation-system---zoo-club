const test = require('node:test');
const assert = require('node:assert/strict');

const { ValidationError, validateGenerateRequest } = require('../src/utils/validation');

test('accepts a valid roster and group count', () => {
  const result = validateGenerateRequest(
    [
      { name: 'Rahul Kumar', dob: '2014-05-12' },
      { name: 'Ananya Sharma', dob: '2013-08-21' },
    ],
    2
  );
  assert.equal(result.students.length, 2);
  assert.equal(result.students[0].age, 12);
  assert.equal(result.numberOfGroups, 2);
});

test('rejects an empty roster', () => {
  assert.throws(() => validateGenerateRequest([], 1), ValidationError);
  assert.throws(() => validateGenerateRequest(null, 1), ValidationError);
});

test('collects every row problem in one pass, not just the first', () => {
  try {
    validateGenerateRequest(
      [
        { name: '', dob: '2014-05-12' },
        { name: 'Bad Date', dob: 'not-a-date' },
        { name: 'Future Kid', dob: '2099-01-01' },
      ],
      1
    );
    assert.fail('expected ValidationError');
  } catch (err) {
    assert.ok(err instanceof ValidationError);
    assert.equal(err.details.length, 3);
  }
});

test('rejects a student outside the configured Zoo Club age range', () => {
  try {
    validateGenerateRequest([{ name: 'Too Young', dob: '2024-01-01' }], 1);
    assert.fail('expected ValidationError');
  } catch (err) {
    assert.match(err.details[0], /outside the supported Zoo Club age range/);
  }
});

test('rejects more groups than students', () => {
  try {
    validateGenerateRequest(
      [
        { name: 'A', dob: '2014-01-01' },
        { name: 'B', dob: '2014-01-01' },
      ],
      5
    );
    assert.fail('expected ValidationError');
  } catch (err) {
    assert.match(err.details.join(' '), /cannot exceed the number of students/);
  }
});

test('rejects zero, negative, and non-integer group counts', () => {
  const students = [{ name: 'A', dob: '2014-01-01' }];
  for (const bad of [0, -1, 1.5, 'six', undefined]) {
    assert.throws(() => validateGenerateRequest(students, bad), ValidationError);
  }
});

test('flags duplicate students (same name + DOB) without discarding them silently', () => {
  try {
    validateGenerateRequest(
      [
        { name: 'Rahul Kumar', dob: '2014-05-12' },
        { name: 'rahul kumar', dob: '2014-05-12' }, // same person, different case
      ],
      1
    );
    assert.fail('expected ValidationError');
  } catch (err) {
    assert.match(err.details.join(' '), /Duplicate student/);
  }
});

test('does not flag same-name students with different birthdays as duplicates', () => {
  const result = validateGenerateRequest(
    [
      { name: 'Rahul Kumar', dob: '2014-05-12' },
      { name: 'Rahul Kumar', dob: '2015-03-01' },
    ],
    2
  );
  assert.equal(result.students.length, 2);
});

test('rejects a future date of birth with a clear message', () => {
  try {
    validateGenerateRequest([{ name: 'Rahul Kumar', dob: '2099-01-01' }], 1);
    assert.fail('expected ValidationError');
  } catch (err) {
    assert.match(err.details[0], /Rahul Kumar/);
    assert.match(err.details[0], /future/i);
  }
});

test('row label includes the student name when available, for readable errors', () => {
  try {
    validateGenerateRequest([{ name: 'Priya Nair', dob: 'garbage' }], 1);
    assert.fail('expected ValidationError');
  } catch (err) {
    assert.match(err.details[0], /Priya Nair/);
  }
});
