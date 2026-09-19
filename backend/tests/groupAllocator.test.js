const test = require('node:test');
const assert = require('node:assert/strict');

const { AllocationError, allocateGroups, _internal } = require('../src/services/groupAllocator');

/** Build N students all of a given age, named S1..SN for readability in failures. */
function studentsOfAge(age, count, prefix = `Age${age}`) {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix}-${i + 1}`,
    dob: '2014-01-01',
    dobDisplay: '01/01/2014',
    age,
  }));
}

/** Core invariants every allocation must satisfy, per the specification. */
function assertValidAllocation(inputStudents, result, numberOfGroups) {
  const { groups } = result;

  assert.equal(groups.length, numberOfGroups, 'group count must equal the request');

  const outputNames = groups.flatMap((g) => g.students.map((s) => s.name));
  assert.equal(
    outputNames.length,
    inputStudents.length,
    'output student count must equal input student count'
  );

  const uniqueNames = new Set(outputNames);
  assert.equal(uniqueNames.size, outputNames.length, 'every student must occur exactly once');

  const inputNames = new Set(inputStudents.map((s) => s.name));
  for (const name of inputNames) {
    assert.ok(uniqueNames.has(name), `missing student: ${name}`);
  }

  const sizes = groups.map((g) => g.students.length);
  assert.ok(
    Math.max(...sizes) - Math.min(...sizes) <= 1,
    `group sizes not balanced: ${sizes.join(', ')}`
  );
}

// --- Test 1: 10 students / 2 groups -----------------------------------------
test('10 students / 2 groups splits evenly', () => {
  const students = studentsOfAge(12, 10);
  const result = allocateGroups(students, 2);
  assertValidAllocation(students, result, 2);
  assert.deepEqual(
    result.groups.map((g) => g.students.length),
    [5, 5]
  );
});

// --- Test 2: 60 students / 6 groups (the specification's worked example) ---
test('60 students / 6 groups: 10 per group, spec example', () => {
  const distribution = { 10: 8, 11: 12, 12: 15, 13: 10, 14: 9, 15: 6 };
  const students = Object.entries(distribution).flatMap(([age, count]) =>
    studentsOfAge(Number(age), count)
  );
  assert.equal(students.length, 60);

  const result = allocateGroups(students, 6);
  assertValidAllocation(students, result, 6);
  assert.deepEqual(
    result.groups.map((g) => g.students.length),
    [10, 10, 10, 10, 10, 10]
  );
});

// --- Test 3: 61 students / 6 groups (uneven total) --------------------------
test('61 students / 6 groups distributes the remainder as evenly as possible', () => {
  const students = studentsOfAge(13, 61);
  const result = allocateGroups(students, 6);
  assertValidAllocation(students, result, 6);
  const sizes = result.groups.map((g) => g.students.length).sort((a, b) => b - a);
  assert.deepEqual(sizes, [11, 10, 10, 10, 10, 10]); // one group of 11, rest of 10
});

// --- Test 4: only one age group ---------------------------------------------
test('a single age group spreads evenly with no leftover clustering', () => {
  const students = studentsOfAge(12, 15);
  const result = allocateGroups(students, 6);
  assertValidAllocation(students, result, 6);
  const sizes = result.groups.map((g) => g.students.length).sort((a, b) => b - a);
  // 15 students / 6 groups: three groups of 3, three groups of 2 (spec example)
  assert.deepEqual(sizes, [3, 3, 3, 2, 2, 2]);
  // and crucially every group actually contains only age-12 students
  for (const group of result.groups) {
    assert.ok(group.students.every((s) => s.age === 12));
  }
});

// --- Test 5: multiple age groups --------------------------------------------
test('multiple age groups: each age is spread across groups, not clustered', () => {
  const students = [...studentsOfAge(10, 6), ...studentsOfAge(11, 6), ...studentsOfAge(12, 6)];
  const result = allocateGroups(students, 3);
  assertValidAllocation(students, result, 3);

  // 18 students, 3 ages x 6 each, 3 groups -> each group should get exactly
  // 2 students of each age (perfectly divisible case).
  for (const group of result.groups) {
    const counts = { 10: 0, 11: 0, 12: 0 };
    group.students.forEach((s) => (counts[s.age] += 1));
    assert.deepEqual(counts, { 10: 2, 11: 2, 12: 2 }, `group ${group.groupNumber} uneven by age`);
  }
});

// --- Test 6: uneven age distribution ----------------------------------------
test('uneven age distribution still balances total group sizes', () => {
  const students = [
    ...studentsOfAge(10, 1),
    ...studentsOfAge(11, 4),
    ...studentsOfAge(12, 13),
    ...studentsOfAge(13, 2),
  ];
  const result = allocateGroups(students, 5);
  assertValidAllocation(students, result, 5);
});

// --- Test 7: fewer students than requested groups ---------------------------
test('rejects a request for more groups than students', () => {
  const students = studentsOfAge(12, 3);
  assert.throws(
    () => allocateGroups(students, 5),
    (err) => err instanceof AllocationError && /exceed/i.test(err.message)
  );
});

// --- Test 8: duplicate students (same name + DOB) ---------------------------
test('two students sharing name and DOB are both kept, not merged', () => {
  const students = [
    { name: 'Rahul Kumar', dob: '2014-05-12', age: 12 },
    { name: 'Rahul Kumar', dob: '2014-05-12', age: 12 },
    { name: 'Ananya Sharma', dob: '2013-08-21', age: 13 },
  ];
  const result = allocateGroups(students, 2);

  const outputStudents = result.groups.flatMap((g) => g.students);
  assert.equal(outputStudents.length, students.length, 'no student lost or duplicated');

  const rahulCount = outputStudents.filter((s) => s.name === 'Rahul Kumar').length;
  assert.equal(rahulCount, 2, 'both same-named students must survive allocation');

  const sizes = result.groups.map((g) => g.students.length);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, 'group sizes must stay balanced');
});

// --- Test 9 & 10: invalid / future DOB -------------------------------------
// Date validity is the responsibility of ageCalculator / validation, not the
// allocator (which only ever receives students with an already-computed
// age). The allocator's job here is to not silently accept nonsense input.
test('rejects empty student list', () => {
  assert.throws(() => allocateGroups([], 2), AllocationError);
});

test('rejects zero or fractional groups', () => {
  const students = studentsOfAge(12, 5);
  assert.throws(() => allocateGroups(students, 0), AllocationError);
  assert.throws(() => allocateGroups(students, 2.5), AllocationError);
  assert.throws(() => allocateGroups(students, -1), AllocationError);
});

// --- Test 11 & 12: minimum / maximum age students ---------------------------
test('handles students at the minimum and maximum configured ages together', () => {
  const students = [...studentsOfAge(10, 5), ...studentsOfAge(18, 5)];
  const result = allocateGroups(students, 2);
  assertValidAllocation(students, result, 2);
});

// --- Test 13: large dataset --------------------------------------------------
test('large dataset (600 students, 20 groups) stays balanced and lossless', () => {
  const ages = [10, 11, 12, 13, 14, 15, 16, 17, 18];
  let students = [];
  ages.forEach((age, i) => {
    // deliberately uneven counts per age
    students = students.concat(studentsOfAge(age, 40 + i * 7, `A${age}`));
  });
  const result = allocateGroups(students, 20);
  assertValidAllocation(students, result, 20);
});

// --- Determinism -------------------------------------------------------------
test('allocation is deterministic for the same input', () => {
  const distribution = { 10: 8, 11: 12, 12: 15, 13: 10, 14: 9, 15: 6 };
  const students = Object.entries(distribution).flatMap(([age, count]) =>
    studentsOfAge(Number(age), count)
  );

  const first = allocateGroups(students, 6);
  const second = allocateGroups(students, 6);

  assert.deepEqual(
    first.groups.map((g) => g.students.map((s) => s.name)),
    second.groups.map((g) => g.students.map((s) => s.name))
  );
});

// --- No student appears in more than one group (explicit, beyond the helper) -
test('no student appears in more than one group, explicitly checked', () => {
  const students = studentsOfAge(11, 37);
  const result = allocateGroups(students, 4);
  const seen = new Set();
  for (const group of result.groups) {
    for (const student of group.students) {
      const key = `${student.name}__${group.groupNumber}`;
      assert.ok(!seen.has(student.name), `${student.name} appeared in more than one group`);
      seen.add(student.name);
    }
  }
});

// --- Age distribution summary -----------------------------------------------
test('age distribution summary matches the input counts, sorted by age', () => {
  const distribution = { 12: 15, 10: 8, 14: 9, 11: 12, 15: 6, 13: 10 };
  const students = Object.entries(distribution).flatMap(([age, count]) =>
    studentsOfAge(Number(age), count)
  );
  const result = allocateGroups(students, 6);
  assert.deepEqual(result.ageDistribution, [
    { age: 10, count: 8 },
    { age: 11, count: 12 },
    { age: 12, count: 15 },
    { age: 13, count: 10 },
    { age: 14, count: 9 },
    { age: 15, count: 6 },
  ]);
});

// --- Internal helper: round-robin rotation actually rotates -----------------
test('internal: distributeBucketRoundRobin places students starting at the given index', () => {
  const bucket = studentsOfAge(12, 4);
  const groups = [[], [], []];
  const next = _internal.distributeBucketRoundRobin(bucket, groups, 1);
  assert.deepEqual(
    groups.map((g) => g.length),
    [1, 2, 1] // starting at index 1: groups 1,2,0,1 get students -> group1:2, group2:1, group0:1
  );
  assert.equal(next, (1 + 4) % 3);
});

// --- Internal helper: buckets ordered largest-first, ties by age ascending --
test('internal: orderBucketsLargestFirst sorts by size desc, then age asc', () => {
  const students = [
    ...studentsOfAge(14, 3),
    ...studentsOfAge(10, 5),
    ...studentsOfAge(12, 5),
    ...studentsOfAge(11, 1),
  ];
  const buckets = _internal.bucketByAge(students);
  const ordered = _internal.orderBucketsLargestFirst(buckets);
  assert.deepEqual(
    ordered.map(([age]) => age),
    [10, 12, 14, 11] // two buckets of size 5 tie -> age 10 before age 12
  );
});

// --- Balancing pass converges and respects the <=1 gap rule -----------------
test('internal: balanceGroupSizes fixes an artificially unbalanced set of groups', () => {
  const groups = [studentsOfAge(12, 5), studentsOfAge(12, 1), studentsOfAge(12, 1)];
  _internal.balanceGroupSizes(groups);
  const sizes = groups.map((g) => g.length);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, sizes.join(','));
  assert.equal(sizes.reduce((a, b) => a + b), 7);
});
