/**
 * groupAllocator.js
 *
 * Divides Zoo Club students into groups using age-balanced allocation.
 *
 * Allocation rules:
 *
 * 1. Group sizes should be as equal as mathematically possible.
 *
 * 2. Students of the same age should be distributed as evenly as possible
 *    across all groups.
 *
 *    Examples with 5 groups:
 *
 *      5 students  -> 1, 1, 1, 1, 1
 *      10 students -> 2, 2, 2, 2, 2
 *      7 students  -> 2, 2, 1, 1, 1
 *      8 students  -> 2, 2, 2, 1, 1
 *
 * 3. When an age has a remainder, the extra students are assigned to the
 *    groups that currently have the fewest students.
 *
 * 4. The allocation is deterministic.
 *    The same input always produces the same output.
 *
 * 5. No randomness is used.
 *
 * 6. No student can appear in more than one group.
 *
 * 7. No student can be lost during allocation.
 */

/**
 * @typedef {Object} Student
 * @property {string} name
 * @property {string} dob
 * @property {string} [dobDisplay]
 * @property {number} age
 */

class AllocationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AllocationError";
  }
}

/**
 * Build a frequency table:
 *
 * age -> students
 *
 * Students remain in their original input order.
 */
function bucketByAge(students) {
  const buckets = new Map();

  for (const student of students) {
    if (!buckets.has(student.age)) {
      buckets.set(student.age, []);
    }

    buckets.get(student.age).push(student);
  }

  return buckets;
}

/**
 * Order age buckets from oldest to youngest.
 *
 * Why?
 *
 * Processing larger/older age buckets first makes the allocation easier
 * to reason about and produces a stable management-friendly result.
 *
 * Ties are resolved by age descending.
 */
function orderBucketsForAllocation(buckets) {
  return Array.from(buckets.entries()).sort((a, b) => {
    const [ageA, studentsA] = a;
    const [ageB, studentsB] = b;

    /*
     * Larger bucket first.
     */
    if (studentsB.length !== studentsA.length) {
      return studentsB.length - studentsA.length;
    }

    /*
     * If bucket sizes are equal, older age first.
     */
    return ageB - ageA;
  });
}

/**
 * Return group indexes ordered by:
 *
 * 1. Current group size, smallest first.
 * 2. Group index, smallest first.
 *
 * This deterministic ordering is important.
 */
function getGroupsBySmallestSize(groups) {
  return groups
    .map((group, index) => ({
      index,
      size: group.length,
    }))
    .sort((a, b) => {
      if (a.size !== b.size) {
        return a.size - b.size;
      }

      return a.index - b.index;
    })
    .map((entry) => entry.index);
}

/**
 * Distribute ONE age bucket across the groups.
 *
 * This is the core of the new algorithm.
 *
 * Suppose:
 *
 *   10 students
 *   5 groups
 *
 * Then:
 *
 *   base = Math.floor(10 / 5) = 2
 *   remainder = 0
 *
 * Therefore every group gets exactly 2 students.
 *
 *
 * Suppose:
 *
 *   7 students
 *   5 groups
 *
 * Then:
 *
 *   base = 1
 *   remainder = 2
 *
 * Therefore:
 *
 *   2, 2, 1, 1, 1
 *
 * The two extra students go to the groups that currently
 * have the fewest total students.
 */
function distributeAgeBucketEvenly(bucket, groups) {
  const numberOfGroups = groups.length;
  const studentCount = bucket.length;

  const baseCount = Math.floor(studentCount / numberOfGroups);

  const remainder = studentCount % numberOfGroups;

  /*
   * Every group receives the same base number of students
   * from this age.
   */
  const studentIndexByGroup = Array(numberOfGroups).fill(0);

  for (let groupIndex = 0; groupIndex < numberOfGroups; groupIndex++) {
    for (let i = 0; i < baseCount; i++) {
      const student = bucket[studentIndexByGroup[groupIndex]];

      groups[groupIndex].push(student);

      studentIndexByGroup[groupIndex] += 1;
    }
  }

  /*
   * The base distribution above used the bucket indexes
   * independently for each group, which is not sufficient.
   *
   * Rebuild this bucket distribution using a sequential index.
   *
   * We remove the students just inserted and perform the
   * deterministic distribution correctly below.
   */
  for (let groupIndex = 0; groupIndex < numberOfGroups; groupIndex++) {
    groups[groupIndex].splice(groups[groupIndex].length - baseCount, baseCount);
  }

  /*
   * First give the base count to every group.
   *
   * Students are assigned sequentially:
   *
   * Group 1 gets bucket[0], bucket[1], ...
   * Group 2 gets the next baseCount students, etc.
   */
  let cursor = 0;

  for (let groupIndex = 0; groupIndex < numberOfGroups; groupIndex++) {
    for (let i = 0; i < baseCount; i++) {
      groups[groupIndex].push(bucket[cursor]);
      cursor += 1;
    }
  }

  /*
   * Distribute the remaining students.
   *
   * IMPORTANT:
   *
   * Choose the groups with the smallest TOTAL size.
   *
   * This keeps the complete groups balanced, not just the
   * current age distribution.
   */
  if (remainder > 0) {
    const smallestGroups = getGroupsBySmallestSize(groups);

    for (let i = 0; i < remainder; i++) {
      const groupIndex = smallestGroups[i];

      groups[groupIndex].push(bucket[cursor]);
      cursor += 1;
    }
  }

  /*
   * Safety check.
   */
  if (cursor !== studentCount) {
    throw new AllocationError(
      "Age bucket allocation did not consume every student.",
    );
  }
}

/**
 * Count how many students of every age are present in a group.
 */
function ageCountsIn(group) {
  const counts = new Map();

  for (const student of group) {
    counts.set(student.age, (counts.get(student.age) || 0) + 1);
  }

  return counts;
}

/**
 * Verify that a particular age is distributed as evenly as possible.
 *
 * Example:
 *
 * 7 students across 5 groups
 *
 * Valid:
 *   2,2,1,1,1
 *
 * Invalid:
 *   4,1,1,1,0
 */
function validateAgeDistributionForGroup(groups, age, expectedCount) {
  const counts = groups.map((group) => {
    return group.filter((student) => student.age === age).length;
  });

  const minimum = Math.min(...counts);
  const maximum = Math.max(...counts);

  if (maximum - minimum > 1) {
    throw new AllocationError(
      `Age ${age} is not distributed evenly across groups.`,
    );
  }

  if (counts.reduce((sum, count) => sum + count, 0) !== expectedCount) {
    throw new AllocationError(`Age ${age} allocation count is incorrect.`);
  }
}

/**
 * Sort each group for the final display.
 *
 * Youngest to oldest.
 *
 * Within the same age:
 * alphabetically by name.
 *
 * This is cosmetic only.
 * It does NOT change group membership.
 */
function sortGroupForDisplay(group) {
  return [...group].sort((a, b) => {
    if (a.age !== b.age) {
      return a.age - b.age;
    }

    return a.name.localeCompare(b.name);
  });
}

/**
 * Build the age distribution summary.
 */
function buildAgeDistribution(students) {
  const buckets = bucketByAge(students);

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([age, group]) => ({
      age,
      count: group.length,
    }));
}

/**
 * Validate the complete allocation.
 *
 * Checks:
 *
 * 1. Same number of students before and after allocation.
 * 2. No student appears twice.
 * 3. No student is missing.
 * 4. Correct number of groups.
 * 5. Group sizes differ by at most one.
 * 6. Every age is distributed as evenly as mathematically possible.
 */
function validateAllocation(inputStudents, groups, numberOfGroups) {
  const outputStudents = groups.flatMap((group) => group);

  /*
   * ---------------------------------------------------------
   * CHECK 1 — No students lost or duplicated
   * ---------------------------------------------------------
   */
  if (outputStudents.length !== inputStudents.length) {
    throw new AllocationError(
      `Allocation lost or duplicated students: expected ${inputStudents.length}, got ${outputStudents.length}.`,
    );
  }

  /*
   * ---------------------------------------------------------
   * CHECK 2 — Unique internal IDs
   * ---------------------------------------------------------
   */
  const inputIds = new Set(inputStudents.map((student) => student._id));

  const outputIds = outputStudents.map((student) => student._id);

  const outputIdSet = new Set(outputIds);

  if (outputIdSet.size !== outputIds.length) {
    throw new AllocationError("A student appears in more than one group.");
  }

  /*
   * ---------------------------------------------------------
   * CHECK 3 — Every input student exists in output
   * ---------------------------------------------------------
   */
  for (const id of inputIds) {
    if (!outputIdSet.has(id)) {
      throw new AllocationError("A student is missing from the allocation.");
    }
  }

  /*
   * ---------------------------------------------------------
   * CHECK 4 — Correct group count
   * ---------------------------------------------------------
   */
  if (groups.length !== numberOfGroups) {
    throw new AllocationError(
      `Expected ${numberOfGroups} groups but produced ${groups.length}.`,
    );
  }

  /*
   * ---------------------------------------------------------
   * CHECK 5 — Group sizes
   * ---------------------------------------------------------
   */
  const sizes = groups.map((group) => group.length);

  if (Math.max(...sizes) - Math.min(...sizes) > 1) {
    throw new AllocationError("Group sizes are not as balanced as possible.");
  }

  /*
   * ---------------------------------------------------------
   * CHECK 6 — Age distribution
   * ---------------------------------------------------------
   */
  const inputAgeCounts = new Map();

  for (const student of inputStudents) {
    inputAgeCounts.set(student.age, (inputAgeCounts.get(student.age) || 0) + 1);
  }

  for (const [age, expectedCount] of inputAgeCounts) {
    validateAgeDistributionForGroup(groups, age, expectedCount);
  }
}

/**
 * Allocate students into balanced Zoo Club groups.
 *
 * @param {Student[]} students
 *   Students must already have `.age` calculated.
 *
 * @param {number} numberOfGroups
 *
 * @returns {{
 *   groups: Student[][],
 *   ageDistribution: {age:number, count:number}[]
 * }}
 */
function allocateGroups(students, numberOfGroups) {
  /*
   * ---------------------------------------------------------
   * BASIC VALIDATION
   * ---------------------------------------------------------
   */
  if (!Array.isArray(students) || students.length === 0) {
    throw new AllocationError("At least one student is required.");
  }

  if (!Number.isInteger(numberOfGroups) || numberOfGroups < 1) {
    throw new AllocationError(
      "Number of groups must be a whole number of at least 1.",
    );
  }

  if (numberOfGroups > students.length) {
    throw new AllocationError(
      "Number of groups cannot exceed the number of students.",
    );
  }

  /*
   * ---------------------------------------------------------
   * ADD INTERNAL IDS
   * ---------------------------------------------------------
   *
   * The IDs are used only internally to verify that no
   * student gets lost or duplicated.
   */
  const taggedStudents = students.map((student, index) => ({
    ...student,
    _id: index,
  }));

  /*
   * ---------------------------------------------------------
   * CREATE AGE BUCKETS
   * ---------------------------------------------------------
   */
  const buckets = bucketByAge(taggedStudents);

  /*
   * ---------------------------------------------------------
   * ORDER AGE BUCKETS
   * ---------------------------------------------------------
   *
   * Larger age groups first.
   * Ties -> older age first.
   */
  const orderedBuckets = orderBucketsForAllocation(buckets);

  /*
   * ---------------------------------------------------------
   * CREATE EMPTY GROUPS
   * ---------------------------------------------------------
   */
  const groups = Array.from({ length: numberOfGroups }, () => []);

  /*
   * ---------------------------------------------------------
   * AGE-BALANCED DISTRIBUTION
   * ---------------------------------------------------------
   *
   * Every age bucket is independently distributed as evenly
   * as possible.
   */
  for (const [, bucketStudents] of orderedBuckets) {
    distributeAgeBucketEvenly(bucketStudents, groups);
  }

  /*
   * ---------------------------------------------------------
   * VALIDATE FINAL ALLOCATION
   * ---------------------------------------------------------
   */
  validateAllocation(taggedStudents, groups, numberOfGroups);

  /*
   * ---------------------------------------------------------
   * PREPARE CLEAN OUTPUT
   * ---------------------------------------------------------
   *
   * Remove internal _id before returning the result.
   */
  const cleanGroups = groups.map((group, index) => ({
    groupNumber: index + 1,

    students: sortGroupForDisplay(group).map(({ _id, ...student }) => student),
  }));

  /*
   * ---------------------------------------------------------
   * RETURN RESULT
   * ---------------------------------------------------------
   */
  return {
    groups: cleanGroups,

    ageDistribution: buildAgeDistribution(taggedStudents),
  };
}

module.exports = {
  AllocationError,
  allocateGroups,

  /*
   * Exported for unit testing.
   */
  _internal: {
    bucketByAge,
    orderBucketsForAllocation,
    distributeAgeBucketEvenly,
    ageCountsIn,
    getGroupsBySmallestSize,
    validateAgeDistributionForGroup,
    buildAgeDistribution,
    validateAllocation,
  },
};
