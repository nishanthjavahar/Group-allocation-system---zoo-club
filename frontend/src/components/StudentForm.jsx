import { validateStudentRow } from "../utils/validation.js";

export default function StudentForm({
  students,
  onChange,
  showValidationErrors = false,
}) {
  function updateRow(index, field, value) {
    const next = students.map((student, studentIndex) =>
      studentIndex === index
        ? {
            ...student,
            [field]: value,
          }
        : student,
    );

    onChange(next);
  }

  function addRow() {
    onChange([
      ...students,
      {
        name: "",
        dob: "",
      },
    ]);
  }

  function removeRow(index) {
    onChange(students.filter((_, studentIndex) => studentIndex !== index));
  }

  return (
    <div className="space-y-3">
      {/* Desktop headings */}

      <div className="hidden grid-cols-[1fr_1fr_auto] gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid">
        <span>Student Name</span>
        <span>Date of Birth</span>
        <span />
      </div>

      {students.map((student, index) => {
        /*
         * IMPORTANT:
         *
         * We only validate/display field errors
         * AFTER the user clicks Generate Groups.
         *
         * Before that, empty fields remain clean.
         */
        const error =
          showValidationErrors &&
          (student.name.trim() !== "" || student.dob !== "")
            ? validateStudentRow(student)
            : null;

        const hasError = Boolean(error);

        return (
          <div
            key={index}
            className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 sm:border-0 sm:bg-transparent sm:p-0"
          >
            {/* Mobile row number */}

            <div className="mb-2 flex items-center justify-between sm:hidden">
              <span className="text-xs font-semibold text-forest-700">
                Student {index + 1}
              </span>

              {students.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Inputs */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
              {/* Name */}

              <div>
                <label
                  className="mb-1 block text-xs font-medium text-gray-500 sm:hidden"
                  htmlFor={`student-name-${index}`}
                >
                  Student Name
                </label>

                <input
                  id={`student-name-${index}`}
                  type="text"
                  value={student.name}
                  onChange={(event) =>
                    updateRow(index, "name", event.target.value)
                  }
                  placeholder="e.g. Rahul Kumar"
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-gray-300 focus:ring-2 ${
                    hasError
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-gray-200 focus:border-forest-500 focus:ring-forest-100"
                  }`}
                />
              </div>

              {/* DOB */}

              <div>
                <label
                  className="mb-1 block text-xs font-medium text-gray-500 sm:hidden"
                  htmlFor={`student-dob-${index}`}
                >
                  Date of Birth
                </label>

                <input
                  id={`student-dob-${index}`}
                  type="date"
                  value={student.dob}
                  onChange={(event) =>
                    updateRow(index, "dob", event.target.value)
                  }
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
                    hasError
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-gray-200 focus:border-forest-500 focus:ring-forest-100"
                  }`}
                />
              </div>

              {/* Desktop remove */}

              <button
                type="button"
                onClick={() => removeRow(index)}
                aria-label={`Remove row ${index + 1}`}
                className="hidden rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700 sm:block"
              >
                Remove
              </button>
            </div>

            {/* Field error ONLY after Generate */}

            {hasError && (
              <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
            )}
          </div>
        );
      })}

      {/* Add Student */}

      <button
        type="button"
        onClick={addRow}
        className="flex w-full items-center justify-center rounded-xl border border-dashed border-forest-300 bg-forest-50/40 px-4 py-3 text-sm font-semibold text-forest-700 transition hover:bg-forest-50"
      >
        <span className="mr-2 text-lg leading-none">+</span>
        Add Student
      </button>
    </div>
  );
}
