export default function AgeDistribution({ ageDistribution }) {
  if (!ageDistribution || ageDistribution.length === 0) {
    return null;
  }

  const maxCount = Math.max(...ageDistribution.map((item) => item.count));

  return (
    <div className="overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-sm">
      <div className="border-b border-forest-100 px-4 py-4 sm:px-5">
        <h3 className="font-semibold text-forest-900">Age Distribution</h3>

        <p className="mt-0.5 text-xs text-gray-400">
          Student distribution across age groups.
        </p>
      </div>

      <div className="p-4 sm:p-5">
        <div className="space-y-3">
          {ageDistribution.map(({ age, count }) => (
            <div
              key={age}
              className="grid grid-cols-[38px_42px_1fr] items-center gap-3"
            >
              <span className="text-sm font-semibold text-forest-800">
                {age}
              </span>

              <span className="text-right text-xs font-medium text-gray-500">
                {count}
              </span>

              <div className="h-2.5 overflow-hidden rounded-full bg-forest-50">
                <div
                  className="h-full rounded-full bg-forest-500 transition-all"
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
