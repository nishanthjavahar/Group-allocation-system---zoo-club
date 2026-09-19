import AgeDistribution from "./AgeDistribution.jsx";
import GroupCard from "./GroupCard.jsx";

export default function GroupPreview({
  result,
  onRegenerate,
  onDownloadPdf,
  isDownloading,
}) {
  const { summary, groups, ageDistribution } = result;

  const average = (summary.totalStudents / summary.numberOfGroups).toFixed(1);

  return (
    <div className="space-y-5">
      {/* Summary */}

      <div className="rounded-2xl border border-forest-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="px-2 text-center sm:px-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 sm:text-xs">
              Students
            </p>

            <p className="mt-1 text-xl font-bold text-forest-800 sm:text-2xl">
              {summary.totalStudents}
            </p>
          </div>

          <div className="px-2 text-center sm:px-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 sm:text-xs">
              Groups
            </p>

            <p className="mt-1 text-xl font-bold text-forest-800 sm:text-2xl">
              {summary.numberOfGroups}
            </p>
          </div>

          <div className="px-2 text-center sm:px-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 sm:text-xs">
              Avg / Group
            </p>

            <p className="mt-1 text-xl font-bold text-forest-800 sm:text-2xl">
              {average}
            </p>
          </div>
        </div>

        {/* Actions */}

        <div className="mt-5 grid grid-cols-1 gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={onRegenerate}
            className="rounded-xl border border-forest-200 px-4 py-2.5 text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
          >
            Regenerate Groups
          </button>

          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isDownloading}
            className="rounded-xl bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
          >
            {isDownloading ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Age distribution */}

      <AgeDistribution ageDistribution={ageDistribution} />

      {/* Groups */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <GroupCard key={group.groupNumber} group={group} />
        ))}
      </div>
    </div>
  );
}
