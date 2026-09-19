import { useRef, useState } from "react";

import { parseExcelFile } from "../services/api.js";

export default function ExcelUpload({ onParsed }) {
  const inputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);

  const [error, setError] = useState(null);

  const [fileName, setFileName] = useState(null);

  async function handleFileChange(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) return;

    setFileName(file.name);
    setError(null);
    setIsUploading(true);

    try {
      const { students } = await parseExcelFile(file);

      console.log("STUDENTS RECEIVED BY EXCEL UPLOAD:", students);
      console.log("STUDENT COUNT:", students?.length);

      onParsed(students);
    } catch (err) {
      setError(err.details || [err.message]);
    } finally {
      setIsUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-forest-200 bg-forest-50/40 px-5 py-8 text-center transition hover:border-forest-400 hover:bg-forest-50">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
          📊
        </div>

        <span className="text-sm font-semibold text-forest-800 sm:text-base">
          {isUploading ? "Reading Excel file..." : "Upload student roster"}
        </span>

        <span className="mt-1 text-xs text-gray-500">.xlsx or .xls files</span>

        <span className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-medium text-forest-700 shadow-sm">
          Choose File
        </span>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>

      <div className="flex flex-col gap-2 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Required columns:
          <strong className="ml-1 text-gray-700">Name</strong>
          <span className="mx-1">and</span>
          <strong className="text-gray-700">Date of Birth</strong>
        </span>

        {fileName && !error && !isUploading && (
          <span className="truncate font-medium text-forest-600">
            ✓ {fileName}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">Upload failed</p>

          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {error.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
