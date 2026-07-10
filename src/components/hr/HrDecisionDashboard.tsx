"use client";

import {
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Copy,
  Expand,
  Gauge,
  Lightbulb,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getEmployeeDepartment,
  getEmployeeFunction,
  getEmployeeJob,
  getEmployeeSite,
  type HrDirectoryEmployee,
} from "@/components/hr/HrDirectory";

type HrDecisionDashboardProps = {
  employees: HrDirectoryEmployee[];
  totalEmployees: number;
};

type ChartItem = {
  name: string;
  value: number;
};

type SalaryChartItem = {
  name: string;
  value: number;
  count: number;
};

type ChartExportKind =
  | "donut"
  | "line"
  | "verticalBar"
  | "horizontalBar"
  | "radar";

type ChartExportItem = {
  name: string;
  value: number;
};

type ChartExportConfig = {
  kind: ChartExportKind;
  data: ChartExportItem[];
  valueLabel: string;
  unit?: "count" | "currency" | "percent";
};

type InsightCardProps = {
  title: string;
  description: string;
  level: "info" | "warning" | "success";
};

const chartColors = [
  "#a5b4fc", // indigo doux
  "#6ee7b7", // emerald doux
  "#fcd34d", // amber doux
  "#fda4af", // rose doux
  "#7dd3fc", // sky doux
  "#c4b5fd",
  "#99f6e4",
  "#fecdd3",
];

function percentage(completeItems: number, totalItems: number) {
  if (totalItems === 0) {
    return 0;
  }

  return Math.round((completeItems / totalItems) * 100);
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    preboarding: "Pré-intégration",
    probation: "Période d’essai",
    active: "Actif",
    suspended: "Suspendu",
    notice_period: "Préavis",
    departed: "Sorti",
    archived: "Archivé",
  };

  return labels[status] ?? status;
}

function groupByValue(
  employees: HrDirectoryEmployee[],
  selector: (employee: HrDirectoryEmployee) => string | null | undefined,
  fallbackLabel: string,
): ChartItem[] {
  const values = new Map<string, number>();

  employees.forEach((employee) => {
    const rawValue = selector(employee)?.trim();
    const label = rawValue || fallbackLabel;

    values.set(label, (values.get(label) ?? 0) + 1);
  });

  return Array.from(values.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((firstItem, secondItem) => secondItem.value - firstItem.value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" })
    .format(date)
    .replace(".", "");
}

function getMonthKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthlySeries(
  employees: HrDirectoryEmployee[],
  selector: (employee: HrDirectoryEmployee) => string | null | undefined,
) {
  const now = new Date();
  const months = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      name: formatMonthLabel(date),
      value: 0,
    };
  });

  const monthMap = new Map(months.map((month) => [month.key, month]));

  employees.forEach((employee) => {
    const key = getMonthKey(selector(employee));
    const currentMonth = key ? monthMap.get(key) : null;

    if (currentMonth) {
      currentMonth.value += 1;
    }
  });

  return months;
}

function getAverageByGroup(
  employees: HrDirectoryEmployee[],
  groupSelector: (employee: HrDirectoryEmployee) => string | null | undefined,
  valueSelector: (employee: HrDirectoryEmployee) => number | null | undefined,
  fallbackLabel: string,
): SalaryChartItem[] {
  const groups = new Map<string, { total: number; count: number }>();

  employees.forEach((employee) => {
    const value = valueSelector(employee);

    if (typeof value !== "number" || value <= 0) {
      return;
    }

    const label = groupSelector(employee)?.trim() || fallbackLabel;
    const currentValue = groups.get(label) ?? { total: 0, count: 0 };

    currentValue.total += value;
    currentValue.count += 1;
    groups.set(label, currentValue);
  });

  return Array.from(groups.entries())
    .map(([name, item]) => ({
      name,
      value: Math.round(item.total / item.count),
      count: item.count,
    }))
    .sort((firstItem, secondItem) => secondItem.value - firstItem.value)
    .slice(0, 10);
}

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatChartValue(value: number, unit: ChartExportConfig["unit"]) {
  if (unit === "currency") {
    return formatCurrency(value);
  }

  if (unit === "percent") {
    return `${Math.round(value)} %`;
  }

  return String(Math.round(value));
}

function buildChartSvg(title: string, description: string, config: ChartExportConfig) {
  const width = 1200;
  const height = 680;
  const left = 92;
  const right = 72;
  const top = 138;
  const bottom = 112;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const data = config.data.length > 0 ? config.data.slice(0, 12) : [{ name: "Aucune donnée", value: 0 }];
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const legend = data
    .slice(0, 8)
    .map((item, index) => {
      const x = left + (index % 4) * 245;
      const y = height - 58 + Math.floor(index / 4) * 22;
      return `<circle cx="${x}" cy="${y}" r="6" fill="${chartColors[index % chartColors.length]}" /><text x="${x + 14}" y="${y + 4}" font-size="12" font-family="Arial" fill="#475569">${escapeSvgText(item.name)} · ${escapeSvgText(formatChartValue(item.value, config.unit))}</text>`;
    })
    .join("");

  let body = "";

  if (config.kind === "donut") {
    const cx = width / 2;
    const cy = top + chartHeight / 2 - 8;
    const radius = 138;
    const strokeWidth = 54;
    let offset = 0;

    body = data
      .map((item, index) => {
        const ratio = total > 0 ? item.value / total : 1 / data.length;
        const circumference = 2 * Math.PI * radius;
        const dash = Math.max(0.01, ratio * circumference);
        const gap = Math.max(0, circumference - dash);
        const segment = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${chartColors[index % chartColors.length]}" stroke-width="${strokeWidth}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round" />`;
        offset += dash;
        return segment;
      })
      .join("");

    body += `<circle cx="${cx}" cy="${cy}" r="${radius - strokeWidth / 2}" fill="#FFFFFF" />`;
    body += `<text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="34" font-family="Arial" font-weight="800" fill="#0F172A">${total}</text>`;
    body += `<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="13" font-family="Arial" fill="#64748B">${escapeSvgText(config.valueLabel)}</text>`;
  } else if (config.kind === "line") {
    const points = data
      .map((item, index) => {
        const x = left + (data.length === 1 ? chartWidth / 2 : (chartWidth / (data.length - 1)) * index);
        const y = top + chartHeight - (item.value / maxValue) * chartHeight;
        return { ...item, x, y };
      });

    body += `<line x1="${left}" y1="${top + chartHeight}" x2="${width - right}" y2="${top + chartHeight}" stroke="#CBD5E1" />`;
    body += `<line x1="${left}" y1="${top}" x2="${left}" y2="${top + chartHeight}" stroke="#CBD5E1" />`;
    body += `<polyline points="${points.map((point) => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="${chartColors[0]}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />`;
    body += points
      .map((point) => `<circle cx="${point.x}" cy="${point.y}" r="6" fill="${chartColors[1]}" /><text x="${point.x}" y="${point.y - 14}" text-anchor="middle" font-size="12" font-family="Arial" font-weight="700" fill="#334155">${formatChartValue(point.value, config.unit)}</text><text x="${point.x}" y="${height - 92}" text-anchor="middle" font-size="11" font-family="Arial" fill="#64748B">${escapeSvgText(point.name)}</text>`)
      .join("");
  } else if (config.kind === "verticalBar") {
    const groupWidth = chartWidth / Math.max(data.length, 1);
    const barWidth = Math.max(22, Math.min(54, groupWidth * 0.5));
    body += `<line x1="${left}" y1="${top + chartHeight}" x2="${width - right}" y2="${top + chartHeight}" stroke="#CBD5E1" />`;
    body += `<line x1="${left}" y1="${top}" x2="${left}" y2="${top + chartHeight}" stroke="#CBD5E1" />`;
    body += data
      .map((item, index) => {
        const x = left + groupWidth * index + groupWidth / 2 - barWidth / 2;
        const barHeight = (item.value / maxValue) * chartHeight;
        const y = top + chartHeight - barHeight;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="10" fill="${chartColors[index % chartColors.length]}" /><text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" font-size="12" font-family="Arial" font-weight="700" fill="#334155">${escapeSvgText(formatChartValue(item.value, config.unit))}</text><text x="${x + barWidth / 2}" y="${height - 92}" text-anchor="middle" font-size="10" font-family="Arial" fill="#64748B">${escapeSvgText(item.name.slice(0, 16))}</text>`;
      })
      .join("");
  } else if (config.kind === "horizontalBar") {
    const rowHeight = chartHeight / Math.max(data.length, 1);
    const barHeight = Math.max(18, Math.min(34, rowHeight * 0.55));
    body += `<line x1="${left + 180}" y1="${top}" x2="${left + 180}" y2="${top + chartHeight}" stroke="#CBD5E1" />`;
    body += data
      .map((item, index) => {
        const y = top + rowHeight * index + rowHeight / 2 - barHeight / 2;
        const barWidth = ((item.value / maxValue) * (chartWidth - 190));
        return `<text x="${left}" y="${y + barHeight / 2 + 4}" font-size="12" font-family="Arial" fill="#475569">${escapeSvgText(item.name.slice(0, 24))}</text><rect x="${left + 190}" y="${y}" width="${barWidth}" height="${barHeight}" rx="9" fill="${chartColors[index % chartColors.length]}" /><text x="${left + 202 + barWidth}" y="${y + barHeight / 2 + 4}" font-size="12" font-family="Arial" font-weight="700" fill="#334155">${escapeSvgText(formatChartValue(item.value, config.unit))}</text>`;
      })
      .join("");
  } else {
    const cx = width / 2;
    const cy = top + chartHeight / 2 - 6;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 36;
    const axes = data.map((item, index) => {
      const angle = (-Math.PI / 2) + (index / data.length) * 2 * Math.PI;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const valueRadius = radius * (item.value / 100);
      const vx = cx + Math.cos(angle) * valueRadius;
      const vy = cy + Math.sin(angle) * valueRadius;
      return { ...item, x, y, vx, vy };
    });
    body += axes.map((axis) => `<line x1="${cx}" y1="${cy}" x2="${axis.x}" y2="${axis.y}" stroke="#CBD5E1" /><text x="${axis.x}" y="${axis.y}" text-anchor="middle" font-size="12" font-family="Arial" fill="#475569">${escapeSvgText(axis.name)}</text>`).join("");
    body += `<polygon points="${axes.map((axis) => `${axis.vx},${axis.vy}`).join(" ")}" fill="${chartColors[1]}" fill-opacity="0.28" stroke="${chartColors[0]}" stroke-width="4" />`;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#FFFFFF" />
      <rect x="28" y="24" width="${width - 56}" height="${height - 48}" rx="28" fill="#F8FAFC" stroke="#BAE6FD" />
      <rect x="28" y="24" width="${width - 56}" height="82" rx="28" fill="#EFF6FF" />
      <text x="${left}" y="60" font-size="25" font-family="Arial" font-weight="800" fill="#0F172A">${escapeSvgText(title)}</text>
      <text x="${left}" y="86" font-size="13" font-family="Arial" fill="#64748B">${escapeSvgText(description)}</text>
      ${body}
      ${legend}
    </svg>
  `.trim();
}

async function copyChartSvg(title: string, description: string, config: ChartExportConfig) {
  const svg = buildChartSvg(title, description, config);

  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return;
  }

  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/svg+xml": new Blob([svg], { type: "image/svg+xml" }),
          "text/plain": new Blob([svg], { type: "text/plain" }),
        }),
      ]);
      return;
    }
  } catch {
    // Fallback texte identique au modèle Staffing.
  }

  try {
    await navigator.clipboard.writeText(svg);
  } catch {
    // Aucun message bloquant : certains navigateurs refusent le presse-papiers image hors HTTPS.
  }
}

function downloadChartPng(blob: Blob, filename = "onepilot-graphique.png") {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyBlobToClipboard(blob: Blob) {
  if (
    typeof navigator === "undefined" ||
    typeof ClipboardItem === "undefined" ||
    !navigator.clipboard?.write
  ) {
    return false;
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}


function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function truncateCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) {
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }

  let nextValue = value;
  while (nextValue.length > 4 && context.measureText(`${nextValue}…`).width > maxWidth) {
    nextValue = nextValue.slice(0, -1);
  }

  return `${nextValue}…`;
}

function drawCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  options?: { align?: CanvasTextAlign; font?: string; fill?: string },
) {
  context.save();
  context.textAlign = options?.align ?? "left";
  context.textBaseline = "alphabetic";
  context.font = options?.font ?? "24px Arial";
  context.fillStyle = options?.fill ?? "#0f172a";
  context.fillText(truncateCanvasText(context, value, maxWidth), x, y);
  context.restore();
}

function createChartCanvas(title: string, description: string, config: ChartExportConfig) {
  const width = 1320;
  const height = 760;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const ctx = context;

  const data = config.data.length > 0
    ? config.data.slice(0, 12)
    : [{ name: "Aucune donnée", value: 0 }];
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const left = 96;
  const right = 76;
  const top = 154;
  const bottom = 118;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const baseY = top + chartHeight;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  drawRoundedRect(ctx, 28, 24, width - 56, height - 48, 30);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#bae6fd";
  ctx.lineWidth = 2;
  ctx.stroke();

  const headerGradient = ctx.createLinearGradient(28, 24, width - 28, 106);
  headerGradient.addColorStop(0, "#f0f9ff");
  headerGradient.addColorStop(0.5, "#ffffff");
  headerGradient.addColorStop(1, "#eef2ff");
  drawRoundedRect(ctx, 28, 24, width - 56, 94, 30);
  ctx.fillStyle = headerGradient;
  ctx.fill();

  drawCanvasText(ctx, title, left, 68, width - left - right - 120, {
    font: "700 30px Arial",
    fill: "#0f172a",
  });
  drawCanvasText(ctx, description, left, 98, width - left - right - 120, {
    font: "18px Arial",
    fill: "#64748b",
  });

  function drawAxes() {
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, baseY);
    ctx.lineTo(width - right, baseY);
    ctx.stroke();

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let index = 1; index <= 4; index += 1) {
      const y = top + (chartHeight / 4) * index;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(width - right, y);
      ctx.stroke();
    }
  }

  function drawLegend(y = height - 58) {
    ctx.font = "14px Arial";
    data.slice(0, 8).forEach((item, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = left + column * 286;
      const itemY = y + row * 24;

      ctx.beginPath();
      ctx.arc(x, itemY - 4, 7, 0, Math.PI * 2);
      ctx.fillStyle = chartColors[index % chartColors.length];
      ctx.fill();

      ctx.fillStyle = "#475569";
      ctx.fillText(
        truncateCanvasText(ctx, `${item.name} · ${formatChartValue(item.value, config.unit)}`, 240),
        x + 16,
        itemY,
      );
    });
  }

  if (config.kind === "donut") {
    const cx = width / 2;
    const cy = top + chartHeight / 2 - 12;
    const radius = 134;
    let startAngle = -Math.PI / 2;

    data.forEach((item, index) => {
      const ratio = total > 0 ? item.value / total : 1 / data.length;
      const endAngle = startAngle + ratio * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.lineWidth = 58;
      ctx.strokeStyle = chartColors[index % chartColors.length];
      ctx.lineCap = "round";
      ctx.stroke();
      startAngle = endAngle;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 82, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    drawCanvasText(ctx, String(total), cx, cy - 5, 200, {
      align: "center",
      font: "800 42px Arial",
      fill: "#0f172a",
    });
    drawCanvasText(ctx, config.valueLabel, cx, cy + 28, 220, {
      align: "center",
      font: "16px Arial",
      fill: "#64748b",
    });
    drawLegend();
  } else if (config.kind === "line") {
    drawAxes();

    const points = data.map((item, index) => {
      const x = left + (data.length === 1 ? chartWidth / 2 : (chartWidth / (data.length - 1)) * index);
      const y = baseY - (item.value / maxValue) * chartHeight;
      return { ...item, x, y };
    });

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.strokeStyle = chartColors[0];
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = chartColors[1];
      ctx.fill();
      drawCanvasText(ctx, formatChartValue(point.value, config.unit), point.x, point.y - 14, 90, {
        align: "center",
        font: "700 14px Arial",
        fill: "#334155",
      });
      drawCanvasText(ctx, point.name, point.x, height - 92, 78, {
        align: "center",
        font: "13px Arial",
        fill: "#64748b",
      });
    });
    drawLegend(height - 46);
  } else if (config.kind === "verticalBar") {
    drawAxes();
    const groupWidth = chartWidth / Math.max(data.length, 1);
    const barWidth = Math.max(34, Math.min(66, groupWidth * 0.52));

    data.forEach((item, index) => {
      const x = left + groupWidth * index + groupWidth / 2 - barWidth / 2;
      const barHeight = (item.value / maxValue) * chartHeight;
      const y = baseY - barHeight;

      drawRoundedRect(ctx, x, y, barWidth, barHeight, 11);
      ctx.fillStyle = chartColors[index % chartColors.length];
      ctx.fill();

      drawCanvasText(ctx, formatChartValue(item.value, config.unit), x + barWidth / 2, y - 12, 120, {
        align: "center",
        font: "700 14px Arial",
        fill: "#334155",
      });
      drawCanvasText(ctx, item.name, x + barWidth / 2, height - 92, groupWidth - 8, {
        align: "center",
        font: "12px Arial",
        fill: "#64748b",
      });
    });
    drawLegend(height - 46);
  } else if (config.kind === "horizontalBar") {
    const labelWidth = 210;
    const rowHeight = chartHeight / Math.max(data.length, 1);
    const barHeight = Math.max(20, Math.min(38, rowHeight * 0.58));
    const barStart = left + labelWidth;
    const maxBarWidth = chartWidth - labelWidth - 28;

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(barStart, top);
    ctx.lineTo(barStart, baseY);
    ctx.stroke();

    data.forEach((item, index) => {
      const y = top + rowHeight * index + rowHeight / 2 - barHeight / 2;
      const barWidth = (item.value / maxValue) * maxBarWidth;

      drawCanvasText(ctx, item.name, left, y + barHeight / 2 + 5, labelWidth - 14, {
        font: "14px Arial",
        fill: "#475569",
      });
      drawRoundedRect(ctx, barStart, y, barWidth, barHeight, 10);
      ctx.fillStyle = chartColors[index % chartColors.length];
      ctx.fill();
      drawCanvasText(ctx, formatChartValue(item.value, config.unit), barStart + barWidth + 12, y + barHeight / 2 + 5, 130, {
        font: "700 14px Arial",
        fill: "#334155",
      });
    });
    drawLegend(height - 46);
  } else {
    const cx = width / 2;
    const cy = top + chartHeight / 2 - 8;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 48;
    const axes = data.map((item, index) => {
      const angle = -Math.PI / 2 + (index / data.length) * Math.PI * 2;
      return {
        ...item,
        angle,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: cx + Math.cos(angle) * radius * (item.value / 100),
        vy: cy + Math.sin(angle) * radius * (item.value / 100),
      };
    });

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    [0.25, 0.5, 0.75, 1].forEach((ratio) => {
      ctx.beginPath();
      axes.forEach((axis, index) => {
        const x = cx + Math.cos(axis.angle) * radius * ratio;
        const y = cy + Math.sin(axis.angle) * radius * ratio;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.stroke();
    });

    axes.forEach((axis) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(axis.x, axis.y);
      ctx.stroke();
      drawCanvasText(ctx, axis.name, axis.x, axis.y, 150, {
        align: "center",
        font: "14px Arial",
        fill: "#475569",
      });
    });

    ctx.beginPath();
    axes.forEach((axis, index) => {
      if (index === 0) {
        ctx.moveTo(axis.vx, axis.vy);
      } else {
        ctx.lineTo(axis.vx, axis.vy);
      }
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(110, 231, 183, 0.28)";
    ctx.strokeStyle = chartColors[0];
    ctx.lineWidth = 4;
    ctx.fill();
    ctx.stroke();
    drawLegend();
  }

  return canvas;
}

function downloadCanvasPng(canvas: HTMLCanvasElement, filename = "onepilot-graphique.png") {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return;
  }

  const url = canvas.toDataURL("image/png", 1);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function copyChartToClipboard(title: string, description: string, config: ChartExportConfig) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "failed" as const;
  }

  const canvas = createChartCanvas(title, description, config);
  if (!canvas) {
    return "failed" as const;
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png", 1);
  });

  if (!blob) {
    return "failed" as const;
  }

  if (
    typeof navigator !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    navigator.clipboard?.write
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      return "copied" as const;
    } catch {
      // Fallback téléchargement ci-dessous.
    }
  }

  downloadCanvasPng(canvas);
  return "downloaded" as const;
}


function getDecisionMetrics(employees: HrDirectoryEmployee[]) {
  const employeesWithoutStructure = employees.filter(
    (employee) =>
      !getEmployeeSite(employee) ||
      !getEmployeeDepartment(employee) ||
      (!getEmployeeJob(employee) && !getEmployeeFunction(employee)),
  ).length;

  const employeesWithoutManager = employees.filter((employee) => !employee.manager_name).length;
  const employeesWithoutCost = employees.filter(
    (employee) => employee.loaded_hourly_cost === null || employee.loaded_hourly_cost === undefined,
  ).length;

  const loadedCosts = employees
    .map((employee) => employee.loaded_hourly_cost)
    .filter((value): value is number => typeof value === "number");

  const averageLoadedHourlyCost =
    loadedCosts.length > 0
      ? loadedCosts.reduce((total, value) => total + value, 0) / loadedCosts.length
      : 0;

  const structureComplete = employees.filter(
    (employee) =>
      Boolean(getEmployeeSite(employee)) &&
      Boolean(getEmployeeDepartment(employee)) &&
      Boolean(getEmployeeJob(employee) || getEmployeeFunction(employee)),
  ).length;

  const managementComplete = employees.filter((employee) => Boolean(employee.manager_name)).length;
  const costComplete = employees.filter(
    (employee) => typeof employee.loaded_hourly_cost === "number",
  ).length;
  const contractComplete = employees.filter((employee) => Boolean(employee.contract_type_name)).length;
  const contactComplete = employees.filter(
    (employee) => Boolean(employee.professional_email) && Boolean(employee.professional_phone),
  ).length;

  const radarData = [
    { subject: "Structure", value: percentage(structureComplete, employees.length) },
    { subject: "Management", value: percentage(managementComplete, employees.length) },
    { subject: "Coûts", value: percentage(costComplete, employees.length) },
    { subject: "Contrats", value: percentage(contractComplete, employees.length) },
    { subject: "Contacts", value: percentage(contactComplete, employees.length) },
  ];

  const qualityScore = radarData.reduce((total, item) => total + item.value, 0) / radarData.length;
  const alerts: InsightCardProps[] = [];

  if (employeesWithoutStructure > 0) {
    alerts.push({
      title: "Rattachements incomplets",
      description: `${employeesWithoutStructure} collaborateur(s) sans structure organisationnelle complète.`,
      level: "warning",
    });
  }

  if (employeesWithoutManager > 0) {
    alerts.push({
      title: "Managers non renseignés",
      description: `${employeesWithoutManager} collaborateur(s) sans manager N+1.`,
      level: "info",
    });
  }

  if (employeesWithoutCost > 0) {
    alerts.push({
      title: "Coûts incomplets",
      description: `${employeesWithoutCost} collaborateur(s) sans taux horaire chargé exploitable.`,
      level: "warning",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "Données RH complètes",
      description: "Les principaux champs nécessaires au pilotage sont renseignés.",
      level: "success",
    });
  }

  return { radarData, qualityScore, alerts, averageLoadedHourlyCost };
}

function InsightCard({ title, description, level }: InsightCardProps) {
  const styles = {
    info: {
      container: "border-sky-100 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20",
      icon: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      badge: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      label: "À suivre",
      Icon: CircleAlert,
    },
    warning: {
      container: "border-amber-100 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
      icon: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      label: "Risque",
      Icon: AlertTriangle,
    },
    success: {
      container: "border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      label: "OK",
      Icon: CheckCircle2,
    },
  } as const;

  const selectedStyle = styles[level];
  const Icon = selectedStyle.Icon;

  return (
    <article className={`rounded-xl border px-3.5 py-3 ${selectedStyle.container}`} title={`${title} — ${description}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-1.5 ${selectedStyle.icon}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="overflow-hidden text-xs font-black leading-snug text-slate-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] dark:text-slate-100" title={title}>{title}</h4>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${selectedStyle.badge}`}>
              {selectedStyle.label}
            </span>
          </div>

          <p className="mt-1 overflow-hidden text-[11px] leading-snug text-slate-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] dark:text-slate-300" title={description}>{description}</p>
        </div>
      </div>
    </article>
  );
}

function DecisionPanel({
  icon: Icon,
  title,
  description,
  accent,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accent: "indigo" | "emerald" | "amber";
  children: ReactNode;
}) {
  const accents = {
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/45 dark:text-indigo-200",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  } as const;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-600/65">
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-2.5 ${accents[accent]}`}>
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-100" title={title}>{title}</h3>
            <p className="mt-1 truncate whitespace-nowrap text-xs text-slate-500 dark:text-slate-300" title={description}>{description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

function ChartCard({
  title,
  description,
  exportConfig,
  children,
}: {
  title: string;
  description: string;
  exportConfig: ChartExportConfig;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "downloaded" | "failed">("idle");

  async function handleCopyChart() {
    setCopyStatus("idle");
    const result = await copyChartToClipboard(title, description, exportConfig);
    setCopyStatus(result);

    window.setTimeout(() => {
      setCopyStatus("idle");
    }, 2600);
  }

  return (
    <article
      ref={containerRef}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-600/65"
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-slate-950 dark:text-slate-100" title={title}>{title}</h3>
          <p className="mt-1 truncate whitespace-nowrap text-xs text-slate-500 dark:text-slate-300" title={description}>{description}</p>
        </div>

        <div data-chart-actions className="flex shrink-0 items-center gap-2">
          {copyStatus !== "idle" && (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 shadow-sm dark:border-slate-500/70 dark:bg-slate-600/80 dark:text-slate-100">
              {copyStatus === "copied" && "Copié"}
              {copyStatus === "downloaded" && "PNG téléchargé"}
              {copyStatus === "failed" && "Copie impossible"}
            </span>
          )}

          <button
            type="button"
            onClick={() => void handleCopyChart()}
            title="Copier"
            aria-label={`Copier ${title}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-800/70 dark:bg-slate-600/65 dark:text-indigo-200 dark:hover:bg-indigo-900/35"
          >
            <Copy className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => containerRef.current?.requestFullscreen?.()}
            title="Agrandir"
            aria-label={`Agrandir ${title}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-800/70 dark:bg-slate-600/65 dark:text-indigo-200 dark:hover:bg-indigo-900/35"
          >
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="h-80 p-4">{children}</div>
    </article>
  );
}

export function HrDecisionInsightPanels({ employees }: { employees: HrDirectoryEmployee[] }) {
  const { qualityScore, alerts, averageLoadedHourlyCost } = getDecisionMetrics(employees);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <DecisionPanel icon={Gauge} title="Synthèse" description="Lecture rapide de la qualité et du coût" accent="indigo">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 dark:border-slate-600/60 dark:bg-slate-600/55">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Coût horaire moyen</p>
          <p className="mt-1.5 text-xl font-black text-indigo-700 dark:text-indigo-300">{formatCurrency(averageLoadedHourlyCost)}</p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 dark:border-slate-600/60 dark:bg-slate-600/55">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Qualité globale</p>
          <p className="mt-1.5 text-xl font-black text-emerald-700 dark:text-emerald-300">{Math.round(qualityScore)} %</p>
        </div>
      </DecisionPanel>

      <DecisionPanel icon={AlertTriangle} title="Alertes" description="Points nécessitant une vérification ou une action." accent="emerald">
        {alerts.map((alert) => (
          <InsightCard key={alert.title} {...alert} />
        ))}
      </DecisionPanel>

      <DecisionPanel icon={Lightbulb} title="Recommandations" description="Actions suggérées pour améliorer le pilotage." accent="amber">
        <InsightCard
          title="Améliorer les données les plus faibles"
          description="Le radar identifie immédiatement les dimensions nécessitant une campagne de complétion."
          level={qualityScore >= 80 ? "success" : "info"}
        />

        {averageLoadedHourlyCost > 0 && (
          <InsightCard
            title="Comparer coût et facturation"
            description={`Le coût horaire moyen est de ${formatCurrency(averageLoadedHourlyCost)}. Il devra être comparé aux taux de vente des projets.`}
            level="success"
          />
        )}
      </DecisionPanel>
    </div>
  );
}

export default function HrDecisionDashboard({ employees, totalEmployees }: HrDecisionDashboardProps) {
  const statusData = groupByValue(
    employees,
    (employee) => getStatusLabel(employee.employment_status),
    "Non renseigné",
  );

  const contractData = groupByValue(employees, (employee) => employee.contract_type_name, "Sans contrat").slice(0, 8);
  const departmentData = groupByValue(employees, (employee) => getEmployeeDepartment(employee), "Sans service").slice(0, 8);
  const jobData = groupByValue(employees, (employee) => getEmployeeJob(employee), "Métier non renseigné").slice(0, 10);
  const functionData = groupByValue(employees, (employee) => getEmployeeFunction(employee), "Fonction non renseignée").slice(0, 10);
  const managerData = groupByValue(employees, (employee) => employee.manager_name, "Manager non renseigné").slice(0, 10);
  const arrivalsByMonth = getMonthlySeries(employees, (employee) => employee.arrival_date);
  const departuresByMonth = getMonthlySeries(employees, (employee) => employee.departure_date);
  const salaryByJobData = getAverageByGroup(
    employees,
    (employee) => getEmployeeJob(employee),
    (employee) => employee.annual_gross_salary,
    "Métier non renseigné",
  );
  const loadedCostByJobData = getAverageByGroup(
    employees,
    (employee) => getEmployeeJob(employee),
    (employee) => employee.loaded_hourly_cost,
    "Métier non renseigné",
  );
  const { radarData } = getDecisionMetrics(employees);

  const filteredRatio = totalEmployees > 0 ? Math.round((employees.length / totalEmployees) * 100) : 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/90 via-white to-indigo-50/75 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-sky-800/50 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Analyse décisionnelle</h2>
          </div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Les résultats suivent le périmètre filtré et donnent au responsable RH/recrutement une lecture complète des effectifs, mouvements, métiers, fonctions, coûts et qualité des données.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-600/55 dark:text-indigo-300">
          <Users className="h-4 w-4" />
          {employees.length} collaborateur{employees.length > 1 ? "s" : ""} — {filteredRatio}% de l’effectif
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Répartition par statut" description="Composition du cycle de vie des collaborateurs." exportConfig={{ kind: "donut", data: statusData, valueLabel: "Collaborateurs", unit: "count" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={65} outerRadius={100} paddingAngle={3}>
                {statusData.map((item, index) => (
                  <Cell key={item.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Répartition par contrat" description="Volumes par mode de collaboration." exportConfig={{ kind: "donut", data: contractData, valueLabel: "Collaborateurs", unit: "count" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={contractData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={65} outerRadius={100} paddingAngle={3}>
                {contractData.map((item, index) => (
                  <Cell key={item.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Arrivées par mois" description="Suivi des intégrations sur les 12 derniers mois." exportConfig={{ kind: "line", data: arrivalsByMonth, valueLabel: "Arrivées", unit: "count" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={arrivalsByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" name="Arrivées" stroke={chartColors[1]} strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sorties par mois" description="Suivi des départs sur les 12 derniers mois." exportConfig={{ kind: "line", data: departuresByMonth, valueLabel: "Sorties", unit: "count" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={departuresByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" name="Sorties" stroke={chartColors[3]} strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Coût chargé par métier" description="Taux horaire chargé moyen exploitable par staffing et finance." exportConfig={{ kind: "verticalBar", data: loadedCostByJobData, valueLabel: "Coût horaire moyen", unit: "currency" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={loadedCostByJobData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tickFormatter={(value) => `${value} €`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="value" name="Coût horaire moyen" radius={[8, 8, 0, 0]} fill={chartColors[4]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Collaborateurs par manager" description="Vision charge managériale et span of control." exportConfig={{ kind: "verticalBar", data: managerData, valueLabel: "Collaborateurs", unit: "count" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={managerData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Collaborateurs" radius={[8, 8, 0, 0]} fill={chartColors[0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Répartition par service" description="Concentrations organisationnelles." exportConfig={{ kind: "horizontalBar", data: departmentData, valueLabel: "Collaborateurs", unit: "count" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Collaborateurs" radius={[0, 8, 8, 0]} fill={chartColors[4]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Répartition par métier" description="Lecture recrutement des métiers les plus représentés." exportConfig={{ kind: "horizontalBar", data: jobData, valueLabel: "Collaborateurs", unit: "count" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jobData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Collaborateurs" radius={[0, 8, 8, 0]} fill={chartColors[0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Répartition par fonction" description="Lecture opérationnelle des fonctions occupées." exportConfig={{ kind: "horizontalBar", data: functionData, valueLabel: "Collaborateurs", unit: "count" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={functionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Collaborateurs" radius={[0, 8, 8, 0]} fill={chartColors[1]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Répartition salaire moyen par métier" description="Comparaison des rémunérations brutes annuelles par métier." exportConfig={{ kind: "horizontalBar", data: salaryByJobData, valueLabel: "Salaire moyen", unit: "currency" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salaryByJobData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
              <XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) / 1000)} k€`} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="value" name="Salaire moyen" radius={[0, 8, 8, 0]} fill={chartColors[2]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Qualité des données RH" description="Complétude des informations nécessaires au pilotage." exportConfig={{ kind: "radar", data: radarData.map((item) => ({ name: item.subject, value: item.value })), valueLabel: "Complétude", unit: "percent" }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Complétude" dataKey="value" stroke={chartColors[0]} fill={chartColors[1]} fillOpacity={0.22} />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}
