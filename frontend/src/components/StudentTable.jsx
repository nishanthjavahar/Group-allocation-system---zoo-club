export default function StudentTable({ students }) {
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
        <p className="text-sm font-medium text-gray-500">
          No students imported yet.
        </p>

        <p className="mt-1 text-xs text-gray-400">
          Upload an Excel file to preview the roster.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      {/* Mobile */}

      <div className="divide-y divide-gray-100 sm:hidden">
        {students.map((student, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3 bg-white px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-50 text-xs font-semibold text-forest-700">
                {index + 1}
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">
                  {student.name}
                </p>

                <p className="text-xs text-gray-400">{student.dob}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop */}

      <div className="hidden sm:block">
        <table className="w-full text-sm">
          <thead className="bg-forest-50 text-forest-700">
            <tr>
              <th className="w-16 px-4 py-3 text-left font-semibold">#</th>

              <th className="px-4 py-3 text-left font-semibold">Name</th>

              <th className="px-4 py-3 text-left font-semibold">
                Date of Birth
              </th>
            </tr>
          </thead>

          <tbody>
            {students.map((student, index) => (
              <tr key={index} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-400">{index + 1}</td>

                <td className="px-4 py-3 font-medium text-gray-700">
                  {student.name}
                </td>

                <td className="px-4 py-3 text-gray-500">{student.dob}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
