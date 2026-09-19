export default function GroupConfiguration({
  totalStudents,
  numberOfGroups,
  onNumberOfGroupsChange,
  minAge,
  maxAge,
  onMinAgeChange,
  onMaxAgeChange,
}) {
  const ageOptions = Array.from({ length: 121 }, (_, index) => index);

  const groupCount = Number(numberOfGroups) || 0;

  const average =
    totalStudents > 0 && groupCount > 0
      ? (totalStudents / groupCount).toFixed(1)
      : "—";

  const tooManyGroups = totalStudents > 0 && groupCount > totalStudents;

  return (
    <div className="space-y-4">
      {/* =================================================
          TOP STAT CARDS
      ================================================= */}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Students */}

        <div className="rounded-xl border border-forest-100 bg-forest-50/70 p-3 sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">
            Students
          </p>

          <p className="mt-1 text-2xl font-bold text-forest-800">
            {totalStudents}
          </p>

          <p className="mt-1 text-[11px] text-gray-400">Current roster</p>
        </div>

        {/* Groups */}

        <div
          className={`rounded-xl border p-3 sm:p-4 ${
            tooManyGroups
              ? "border-red-200 bg-red-50/60"
              : "border-forest-100 bg-white"
          }`}
        >
          <label
            htmlFor="numberOfGroups"
            className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]"
          >
            Groups
          </label>

          <input
            id="numberOfGroups"
            type="number"
            min={1}
            max={totalStudents > 0 ? totalStudents : undefined}
            value={numberOfGroups}
            onChange={(event) => onNumberOfGroupsChange(event.target.value)}
            className={`mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-xl font-bold outline-none transition ${
              tooManyGroups
                ? "border-red-300 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                : "border-forest-200 text-forest-800 focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            }`}
          />

          <p
            className={`mt-1 text-[11px] ${
              tooManyGroups ? "font-medium text-red-600" : "text-gray-400"
            }`}
          >
            {totalStudents > 0
              ? `Maximum possible: ${totalStudents}`
              : "Add students first"}
          </p>
        </div>

        {/* Average */}

        <div className="rounded-xl border border-forest-100 bg-forest-50/70 p-3 sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">
            Avg. / Group
          </p>

          <p className="mt-1 text-2xl font-bold text-forest-800">{average}</p>

          <p className="mt-1 text-[11px] text-gray-400">Expected size</p>
        </div>

        {/* Age filter */}

        <div className="col-span-2 rounded-xl border border-forest-100 bg-white p-3 sm:col-span-1 sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[11px]">
            Age Filter
          </p>

          <p className="mt-1 text-sm font-semibold text-forest-800">
            {minAge === null && maxAge === null
              ? "No restriction"
              : `${minAge ?? "Any"} – ${maxAge ?? "Any"} years`}
          </p>

          <p className="mt-1 text-[11px] text-gray-400">Optional</p>
        </div>
      </div>

      {/* =================================================
          GROUP ERROR
      ================================================= */}

      {tooManyGroups && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
            !
          </div>

          <div>
            <p className="text-sm font-semibold text-red-800">
              Too many groups
            </p>

            <p className="mt-0.5 text-xs leading-5 text-red-600 sm:text-sm">
              You have {totalStudents} student
              {totalStudents === 1 ? "" : "s"}, so you can create at most{" "}
              {totalStudents} group
              {totalStudents === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
      )}

      {/* =================================================
          AGE CRITERIA
      ================================================= */}

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700">Age Criteria</p>

          <p className="mt-0.5 text-xs text-gray-400">
            Leave both as Any to include every valid age.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Minimum */}

          <div>
            <label
              htmlFor="minAge"
              className="mb-1.5 block text-xs font-semibold text-gray-600"
            >
              Minimum Age
            </label>

            <select
              id="minAge"
              value={minAge ?? ""}
              onChange={(event) =>
                onMinAgeChange(
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none transition focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            >
              <option value="">Any</option>

              {ageOptions.map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
          </div>

          {/* Maximum */}

          <div>
            <label
              htmlFor="maxAge"
              className="mb-1.5 block text-xs font-semibold text-gray-600"
            >
              Maximum Age
            </label>

            <select
              id="maxAge"
              value={maxAge ?? ""}
              onChange={(event) =>
                onMaxAgeChange(
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none transition focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            >
              <option value="">Any</option>

              {ageOptions.map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
