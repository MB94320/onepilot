"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";

export type ExportColumn<T> = {
  key: string;
  label: string;

  value: (
    row: T,
  ) =>
    | string
    | number
    | boolean
    | null
    | undefined;
};

type DataExportMenuProps<T> = {
  data: T[];
  columns: ExportColumn<T>[];

  fileName: string;
  sheetName?: string;

  disabled?: boolean;
};

function sanitizeFileName(
  value: string,
) {
  return value
    .trim()
    .replace(
      /[<>:"/\\|?*\u0000-\u001F]/g,
      "-",
    )
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

function formatDateForFileName() {
  return new Intl.DateTimeFormat(
    "fr-CA",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function escapeCsvValue(
  value:
    | string
    | number
    | boolean
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const textValue =
    String(value);

  if (
    textValue.includes(";") ||
    textValue.includes('"') ||
    textValue.includes("\n") ||
    textValue.includes("\r")
  ) {
    return `"${textValue.replace(
      /"/g,
      '""',
    )}"`;
  }

  return textValue;
}

function downloadBlob(
  blob: Blob,
  fileName: string,
) {
  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function DataExportMenu<T>({
  data,
  columns,
  fileName,
  sheetName = "Données",
  disabled = false,
}: DataExportMenuProps<T>) {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    isExporting,
    setIsExporting,
  ] =
    useState<
      "xlsx" | "csv" | null
    >(null);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const isDisabled =
    disabled ||
    data.length === 0 ||
    isExporting !== null;

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape"
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  function buildRows() {
    return data.map((row) => {
      const exportRow: Record<
        string,
        | string
        | number
        | boolean
        | null
      > = {};

      columns.forEach(
        (column) => {
          const value =
            column.value(row);

          exportRow[
            column.label
          ] =
            value === undefined
              ? null
              : value;
        },
      );

      return exportRow;
    });
  }

  async function exportExcel() {
    try {
      setIsExporting("xlsx");
      setIsOpen(false);

      const rows =
        buildRows();

      const worksheet =
        XLSX.utils.json_to_sheet(
          rows,
        );

      const workbook =
        XLSX.utils.book_new();

      const safeSheetName =
        sheetName
          .trim()
          .slice(0, 31) ||
        "Données";

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        safeSheetName,
      );

      const columnWidths =
        columns.map(
          (column) => {
            const longestValue =
              Math.max(
                column.label
                  .length,

                ...data.map(
                  (row) => {
                    const value =
                      column.value(
                        row,
                      );

                    return value ===
                      null ||
                      value ===
                        undefined
                      ? 0
                      : String(
                          value,
                        ).length;
                  },
                ),
              );

            return {
              wch: Math.min(
                Math.max(
                  longestValue +
                    2,
                  12,
                ),
                45,
              ),
            };
          },
        );

      worksheet["!cols"] =
        columnWidths;

      worksheet[
        "!autofilter"
      ] = {
        ref:
          worksheet["!ref"] ??
          "A1:A1",
      };

      worksheet["!freeze"] = {
        xSplit: 0,
        ySplit: 1,
        topLeftCell: "A2",
        activePane:
          "bottomLeft",
        state: "frozen",
      };

      const normalizedFileName =
        sanitizeFileName(
          fileName,
        );

      XLSX.writeFile(
        workbook,
        `${normalizedFileName}_${formatDateForFileName()}.xlsx`,
        {
          compression: true,
        },
      );
    } finally {
      setIsExporting(null);
    }
  }

  async function exportCsv() {
    try {
      setIsExporting("csv");
      setIsOpen(false);

      const separator = ";";

      const header =
        columns
          .map((column) =>
            escapeCsvValue(
              column.label,
            ),
          )
          .join(separator);

      const lines =
        data.map((row) =>
          columns
            .map((column) =>
              escapeCsvValue(
                column.value(
                  row,
                ),
              ),
            )
            .join(separator),
        );

      const csvContent = [
        header,
        ...lines,
      ].join("\r\n");

      const utf8Bom =
        "\uFEFF";

      const blob =
        new Blob(
          [
            utf8Bom,
            csvContent,
          ],
          {
            type:
              "text/csv;charset=utf-8;",
          },
        );

      const normalizedFileName =
        sanitizeFileName(
          fileName,
        );

      downloadBlob(
        blob,
        `${normalizedFileName}_${formatDateForFileName()}.csv`,
      );
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        disabled={isDisabled}
        onClick={() =>
          setIsOpen(
            (
              currentValue,
            ) =>
              !currentValue,
          )
        }
        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 text-xs font-bold text-emerald-700 shadow-md shadow-emerald-100 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:border-emerald-900 dark:bg-slate-950 dark:text-emerald-300 dark:shadow-none dark:hover:bg-emerald-950/30"
      >
        {isExporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}

        <span>
          Exporter
        </span>

        <ChevronDown
          className={`h-3.5 w-3.5 transition ${
            isOpen
              ? "rotate-180"
              : ""
          }`}
        />
      </button>

      {isOpen &&
        !isDisabled && (
          <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <div className="px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Exporter les résultats
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {data.length} ligne
                {data.length > 1
                  ? "s"
                  : ""}{" "}
                sera
                {data.length > 1
                  ? "ont"
                  : ""}{" "}
                exportée
                {data.length > 1
                  ? "s"
                  : ""}
                .
              </p>
            </div>

            <button
              type="button"
              onClick={
                exportExcel
              }
              className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <FileSpreadsheet className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Classeur Excel
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Fichier XLSX
                  structuré avec
                  colonnes, filtres
                  et largeurs
                  adaptées.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={
                exportCsv
              }
              className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-sky-50 dark:hover:bg-sky-950/30"
            >
              <div className="rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <FileText className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Fichier CSV
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Format UTF-8
                  séparé par des
                  points-virgules,
                  compatible avec
                  Excel.
                </p>
              </div>
            </button>
          </div>
        )}
    </div>
  );
}