export default function GroupCard({ group }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-sm">
      {/* Header */}

      <div className="flex items-center justify-between bg-forest-600 px-4 py-3 text-white">
        <div>
          <p className="text-base font-bold">Group {group.groupNumber}</p>

          <p className="text-[11px] text-forest-100">
            Balanced student allocation
          </p>
        </div>

        <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
          {group.students.length} students
        </span>
      </div>

      {/* Mobile cards */}

      <div className="divide-y divide-gray-100 sm:hidden">
        {group.students.map((student, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-50 text-xs font-bold text-forest-700">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800">
                {student.name}
              </p>

              <p className="mt-0.5 text-xs text-gray-400">
                {student.dobDisplay || student.dob}
              </p>
            </div>

            <span className="rounded-lg bg-forest-50 px-2 py-1 text-xs font-bold text-forest-700">
              {student.age}
            </span>
          </div>
        ))}
      </div>

      {/* Desktop table */}

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="bg-forest-50 text-forest-700">
            <tr>
              <th className="w-14 px-4 py-2.5 text-left font-semibold">No.</th>

              <th className="px-4 py-2.5 text-left font-semibold">
                Student Name
              </th>

              <th className="px-4 py-2.5 text-left font-semibold">DOB</th>

              <th className="w-16 px-4 py-2.5 text-left font-semibold">Age</th>
            </tr>
          </thead>

          <tbody>
            {group.students.map((student, index) => (
              <tr key={index} className="border-t border-gray-100">
                <td className="px-4 py-2.5 text-gray-400">{index + 1}</td>

                <td className="px-4 py-2.5 font-medium text-gray-700">
                  {student.name}
                </td>

                <td className="px-4 py-2.5 text-gray-500">
                  {student.dobDisplay || student.dob}
                </td>

                <td className="px-4 py-2.5 font-semibold text-forest-700">
                  {student.age}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
