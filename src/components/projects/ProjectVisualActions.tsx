"use client";

import { useEffect, useState, type RefObject } from "react";
import html2canvas from "html2canvas";
import { Copy, Expand, Minimize2 } from "lucide-react";

type CopyStatus = "idle" | "copied" | "downloaded";

function downloadCanvas(canvas: HTMLCanvasElement, fileName: string) {
  const link = document.createElement("a");
  link.download = `${fileName}.png`;
  link.href = canvas.toDataURL("image/png", 1);
  link.click();
}

function canvasContext(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(640, Math.min(12000, width));
  canvas.height = Math.max(360, Math.min(12000, height));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponible");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

function wrapText(context: CanvasRenderingContext2D, value: string, width: number) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > width && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  });
  if (line) lines.push(line);
  return lines.length ? lines : ["—"];
}

function tableFallback(target: HTMLElement, label: string) {
  const table = target.querySelector("table");
  if (!table) return null;
  const rows = Array.from(table.querySelectorAll("tr")).slice(0, 250);
  const columnCount = Math.max(1, ...rows.map((row) => row.children.length));
  const columnWidth = 220;
  const rowHeight = 58;
  const titleHeight = 76;
  const { canvas, context } = canvasContext(columnCount * columnWidth + 48, titleHeight + rows.length * rowHeight + 30);
  context.fillStyle = "#0f172a";
  context.font = "700 24px Arial";
  context.fillText(label, 24, 42);
  rows.forEach((row, rowIndex) => {
    const cells = Array.from(row.children);
    cells.forEach((cell, columnIndex) => {
      const x = 24 + columnIndex * columnWidth;
      const y = titleHeight + rowIndex * rowHeight;
      context.fillStyle = rowIndex === 0 ? "#f0f9ff" : rowIndex % 2 ? "#ffffff" : "#f8fafc";
      context.fillRect(x, y, columnWidth, rowHeight);
      context.strokeStyle = "#cbd5e1";
      context.strokeRect(x, y, columnWidth, rowHeight);
      context.fillStyle = rowIndex === 0 ? "#475569" : "#0f172a";
      context.font = rowIndex === 0 ? "700 12px Arial" : "13px Arial";
      wrapText(context, (cell.textContent || "—").replace(/\s+/g, " "), columnWidth - 18).slice(0, 3).forEach((line, lineIndex) => context.fillText(line, x + 9, y + 19 + lineIndex * 16));
    });
  });
  return canvas;
}

function semanticGantt(target: HTMLElement, label: string) {
  const rows = [...target.querySelectorAll<HTMLElement>("[data-gantt-row], div.absolute.left-0.grid")];
  if (!rows.length) return null;
  rows.forEach((row) => {
    if (row.dataset.start) return;
    const fixed = row.children.item(0);
    const cells = fixed ? [...fixed.children] : [];
    const parseFrenchDate = (value: string) => {
      const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      return match ? `${match[3]}-${match[2]}-${match[1]}T12:00:00Z` : new Date().toISOString();
    };
    row.dataset.project = cells[0]?.textContent?.trim() || "Projet";
    row.dataset.task = cells[1]?.textContent?.trim() || "Tâche";
    row.dataset.owner = cells[2]?.textContent?.trim() || "Non affecté";
    row.dataset.startLabel = cells[3]?.textContent?.trim() || "—";
    row.dataset.endLabel = cells[4]?.textContent?.trim() || "—";
    row.dataset.start = parseFrenchDate(row.dataset.startLabel);
    row.dataset.end = parseFrenchDate(row.dataset.endLabel);
    const progressText = cells[7]?.textContent || row.textContent || "0";
    row.dataset.progress = progressText.match(/(\d+(?:[,.]\d+)?)\s*%/)?.[1]?.replace(",", ".") || "0";
    row.dataset.critical = /Oui/i.test(cells[10]?.textContent || "") ? "true" : "false";
    row.dataset.overdue = row.querySelector(".bg-amber-300") ? "true" : "false";
    row.dataset.milestone = row.querySelector(".rotate-45.bg-emerald-500") ? "true" : "false";
  });
  const width = 1900;
  const left = 560;
  const top = 116;
  const rowHeight = 52;
  const height = Math.max(480, top + rows.length * rowHeight + 86);
  const { canvas, context } = canvasContext(width, height);
  const starts = rows.map((row) => Date.parse(row.dataset.start || "")).filter(Number.isFinite);
  const ends = rows.map((row) => Date.parse(row.dataset.end || "")).filter(Number.isFinite);
  const minDate = starts.length ? Math.min(...starts) : Date.now();
  const maxDate = ends.length ? Math.max(...ends) : minDate + 86_400_000;
  const range = Math.max(86_400_000, maxDate - minDate);
  const chartWidth = width - left - 50;
  context.fillStyle = "#0f172a";
  context.font = "700 25px Arial";
  context.fillText(label, 28, 40);
  context.fillStyle = "#64748b";
  context.font = "13px Arial";
  context.fillText("Planification, avancement, retards, jalons et chemin critique", 28, 66);
  context.fillStyle = "#f0f9ff";
  context.fillRect(24, 84, width - 48, 42);
  context.fillStyle = "#475569";
  context.font = "700 12px Arial";
  ["Projet", "Tâche", "Ressource", "Début", "Fin"].forEach((value, index) => context.fillText(value, 34 + [0, 135, 340, 438, 498][index], 109));
  for (let tick = 0; tick <= 10; tick += 1) {
    const x = left + (chartWidth * tick) / 10;
    context.strokeStyle = "#e2e8f0";
    context.beginPath(); context.moveTo(x, 84); context.lineTo(x, height - 54); context.stroke();
    const stamp = new Date(minDate + (range * tick) / 10);
    context.fillStyle = "#64748b"; context.font = "11px Arial";
    context.fillText(new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(stamp), x + 3, 109);
  }
  rows.forEach((row, index) => {
    const y = top + index * rowHeight;
    context.fillStyle = index % 2 ? "#ffffff" : "#f8fafc";
    context.fillRect(24, y, width - 48, rowHeight);
    context.strokeStyle = "#e2e8f0"; context.beginPath(); context.moveTo(24, y + rowHeight); context.lineTo(width - 24, y + rowHeight); context.stroke();
    const project = row.dataset.project || "Projet";
    const task = row.dataset.task || "Tâche";
    const owner = row.dataset.owner || "Non affecté";
    context.fillStyle = "#4338ca"; context.font = "700 12px Arial"; context.fillText(project.slice(0, 18), 34, y + 31);
    context.fillStyle = "#0f172a"; context.font = "12px Arial"; context.fillText(task.slice(0, 31), 169, y + 31);
    context.fillStyle = "#475569"; context.fillText(owner.slice(0, 15), 374, y + 31);
    context.font = "11px Arial"; context.fillText(row.dataset.startLabel || "—", 462, y + 31); context.fillText(row.dataset.endLabel || "—", 522, y + 31);
    const start = Date.parse(row.dataset.start || "");
    const end = Date.parse(row.dataset.end || "");
    const x = left + ((Number.isFinite(start) ? start : minDate) - minDate) / range * chartWidth;
    const barWidth = Math.max(16, (((Number.isFinite(end) ? end : start) - (Number.isFinite(start) ? start : minDate)) / range) * chartWidth);
    const progress = Math.max(0, Math.min(100, Number(row.dataset.progress || 0)));
    const milestone = row.dataset.milestone === "true";
    if (milestone) {
      context.save(); context.translate(x + 8, y + 26); context.rotate(Math.PI / 4); context.fillStyle = "#10b981"; context.fillRect(-7, -7, 14, 14); context.restore();
    } else {
      context.fillStyle = row.dataset.critical === "true" ? "#fb7185" : row.dataset.overdue === "true" ? "#fcd34d" : "#c7d2fe";
      context.fillRect(x, y + 15, Math.min(chartWidth - (x - left), barWidth), 23);
      context.fillStyle = "#4f46e5";
      context.fillRect(x, y + 15, Math.min(chartWidth - (x - left), barWidth * progress / 100), 23);
      context.fillStyle = "#0f172a"; context.font = "700 10px Arial"; context.fillText(`${Math.round(progress)} %`, x + 5, y + 31);
    }
  });
  context.fillStyle = "#475569"; context.font = "700 11px Arial";
  context.fillText("Indigo clair : travail restant · Indigo : avancement · Ambre : retard · Rose : chemin critique · Vert : jalon", 28, height - 24);
  return canvas;
}

function semanticTimeline(target: HTMLElement, label: string) {
  const rows = [...target.querySelectorAll<HTMLElement>("[data-timeline-card], button.group")];
  if (!rows.length) return null;
  rows.forEach((row) => {
    if (row.dataset.title) return;
    const title = row.querySelector("h3")?.textContent?.trim() || "Projet";
    const paragraphs = [...row.querySelectorAll("p")];
    const texts = [...row.querySelectorAll("span")].map((element) => element.textContent?.trim() || "");
    row.dataset.title = title;
    row.dataset.client = paragraphs[0]?.textContent?.trim() || "Projet interne";
    row.dataset.start = texts.find((value) => /\d{2}\s+\w+\.?\s+\d{4}/i.test(value)) || "—";
    row.dataset.end = texts.filter((value) => /\d{2}\s+\w+\.?\s+\d{4}/i.test(value))[1] || "—";
    row.dataset.progress = texts.find((value) => /^\d+\s*%$/.test(value))?.replace("%", "").trim() || "0";
    row.dataset.risks = texts.find((value) => value.includes("risque"))?.match(/\d+/)?.[0] || "0";
    row.dataset.nc = texts.find((value) => /\bNC\b/.test(value))?.match(/\d+/)?.[0] || "0";
    row.dataset.actions = texts.find((value) => value.includes("action"))?.match(/\d+/)?.[0] || "0";
    row.dataset.owner = paragraphs.find((value) => value.textContent?.includes("Responsable") || value.querySelector("svg"))?.textContent?.trim() || paragraphs[1]?.textContent?.trim() || "À affecter";
    row.dataset.milestone = paragraphs.at(-1)?.textContent?.trim() || "Non renseigné";
    row.dataset.status = texts.find((value) => ["Ouvert", "En cours", "Clos", "Bloqué", "Annulé", "En attente"].includes(value)) || "Ouvert";
    row.dataset.alert = row.className.includes("rose") || Boolean(row.querySelector(".bg-rose-400")) ? "true" : "false";
  });
  const cardWidth = 300;
  const gap = 34;
  const width = Math.max(1280, 90 + rows.length * (cardWidth + gap));
  const height = 720;
  const { canvas, context } = canvasContext(width, height);
  context.fillStyle = "#0f172a"; context.font = "700 25px Arial"; context.fillText(label, 28, 40);
  context.fillStyle = "#64748b"; context.font = "13px Arial"; context.fillText("Ordre croissant des dates de fin projet", 28, 66);
  const axisY = 360;
  context.fillStyle = "#a5b4fc"; context.fillRect(44, axisY - 4, width - 90, 8);
  rows.forEach((row, index) => {
    const x = 55 + index * (cardWidth + gap);
    const above = index % 2 === 0;
    const y = above ? 100 : 414;
    const color = row.dataset.alert === "true" ? "#fb7185" : row.dataset.status === "Clos" ? "#34d399" : "#fcd34d";
    context.fillStyle = "#ffffff"; context.strokeStyle = "#cbd5e1"; context.lineWidth = 1.5; context.fillRect(x, y, cardWidth, 218); context.strokeRect(x, y, cardWidth, 218);
    context.fillStyle = color; context.fillRect(x, y, cardWidth, 8);
    context.fillStyle = "#0f172a"; context.font = "700 14px Arial"; wrapText(context, row.dataset.title || "Projet", cardWidth - 28).slice(0, 2).forEach((line, lineIndex) => context.fillText(line, x + 14, y + 36 + lineIndex * 18));
    context.fillStyle = "#64748b"; context.font = "12px Arial"; context.fillText((row.dataset.client || "Projet interne").slice(0, 38), x + 14, y + 78);
    context.fillText(`${row.dataset.start || "—"}  →  ${row.dataset.end || "—"}`, x + 14, y + 105);
    context.fillStyle = "#e0e7ff"; context.fillRect(x + 14, y + 123, cardWidth - 28, 10);
    context.fillStyle = "#4f46e5"; context.fillRect(x + 14, y + 123, (cardWidth - 28) * Math.max(0, Math.min(100, Number(row.dataset.progress || 0))) / 100, 10);
    context.fillStyle = "#334155"; context.font = "700 11px Arial"; context.fillText(`${row.dataset.progress || 0} % · ${row.dataset.risks || 0} risque(s) · ${row.dataset.nc || 0} NC · ${row.dataset.actions || 0} action(s)`, x + 14, y + 154);
    context.fillText(`Responsable : ${row.dataset.owner || "À affecter"}`, x + 14, y + 178);
    context.fillText(`Jalon : ${row.dataset.milestone || "Non renseigné"}`, x + 14, y + 199);
    context.strokeStyle = color; context.lineWidth = 2; context.beginPath(); context.moveTo(x + cardWidth / 2, above ? y + 218 : axisY); context.lineTo(x + cardWidth / 2, above ? axisY : y); context.stroke();
    context.save(); context.translate(x + cardWidth / 2, axisY); context.rotate(Math.PI / 4); context.fillStyle = color; context.fillRect(-8, -8, 16, 16); context.restore();
  });
  return canvas;
}

function semanticRiskMatrix(target: HTMLElement, label: string) {
  const cells = [...target.querySelectorAll<HTMLElement>("[data-risk-cell], .min-h-14")].slice(0, 16);
  if (!cells.length) return null;
  cells.forEach((cell, index) => {
    if (cell.dataset.probability) return;
    cell.dataset.probability = String((index % 4) + 1);
    cell.dataset.impact = String(4 - Math.floor(index / 4));
    cell.dataset.count = cell.textContent?.trim() || "0";
  });
  const { canvas, context } = canvasContext(1160, 720);
  context.fillStyle = "#0f172a"; context.font = "700 25px Arial"; context.fillText(label, 28, 40);
  context.fillStyle = "#64748b"; context.font = "13px Arial"; context.fillText("Probabilité × impact · nombre de risques par cellule", 28, 66);
  const left = 180; const top = 130; const cellWidth = 225; const cellHeight = 110;
  ["Improbable", "Possible", "Probable", "Très probable"].forEach((value, index) => { context.fillStyle = "#475569"; context.font = "700 13px Arial"; context.textAlign = "center"; context.fillText(value, left + index * cellWidth + cellWidth / 2, 108); });
  ["Faible", "Moyen", "Sérieux", "Majeur"].forEach((value, reverseIndex) => { const index = 3 - reverseIndex; context.textAlign = "right"; context.fillStyle = "#475569"; context.fillText(value, left - 18, top + index * cellHeight + cellHeight / 2 + 5); });
  cells.forEach((cell) => {
    const probability = Number(cell.dataset.probability || 1);
    const impact = Number(cell.dataset.impact || 1);
    const score = probability * impact;
    const x = left + (probability - 1) * cellWidth;
    const y = top + (4 - impact) * cellHeight;
    context.fillStyle = score >= 12 ? "#fb7185" : score >= 8 ? "#fb923c" : score >= 4 ? "#fcd34d" : "#86efac";
    context.fillRect(x + 3, y + 3, cellWidth - 6, cellHeight - 6);
    context.fillStyle = "#0f172a"; context.font = "700 28px Arial"; context.textAlign = "center"; context.fillText(cell.dataset.count || "0", x + cellWidth / 2, y + cellHeight / 2 + 10);
  });
  context.textAlign = "left"; context.font = "700 12px Arial"; context.fillStyle = "#166534"; context.fillText("● Négligeable", 180, 610); context.fillStyle = "#a16207"; context.fillText("● Significatif", 390, 610); context.fillStyle = "#c2410c"; context.fillText("● Critique", 600, 610); context.fillStyle = "#be123c"; context.fillText("● Inacceptable", 790, 610);
  return canvas;
}

function semanticFallback(target: HTMLElement, label: string) {
  const visual = target.matches("[data-visual-kind]") ? target : target.querySelector<HTMLElement>("[data-visual-kind]") || target;
  const content = visual.textContent || "";
  const kind = visual.dataset.visualKind
    || (content.includes("Planification détaillée") ? "gantt" : "")
    || (content.includes("Trajectoire complète") ? "timeline" : "")
    || (content.includes("Matrice des risques 4 × 4") ? "risk-matrix" : "");
  if (kind === "gantt") return semanticGantt(visual, label);
  if (kind === "timeline") return semanticTimeline(visual, label);
  if (kind === "risk-matrix") return semanticRiskMatrix(visual, label);
  return null;
}

async function svgFallback(target: HTMLElement, label: string) {
  const svg = [...target.querySelectorAll("svg[data-visual-svg]")]
    .filter((item) => item.getBoundingClientRect().width >= 220 && item.getBoundingClientRect().height >= 120)
    .sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
  if (!svg) return null;
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const bounds = svg.getBoundingClientRect();
  const width = Math.max(900, Math.ceil(bounds.width));
  const height = Math.max(420, Math.ceil(bounds.height));
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("SVG illisible")); image.src = url; });
    const result = canvasContext(width + 48, height + 92);
    result.context.fillStyle = "#0f172a";
    result.context.font = "700 24px Arial";
    result.context.fillText(label, 24, 40);
    result.context.drawImage(image, 24, 68, width, height);
    return result.canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderTarget(target: HTMLElement, label: string) {
  const semantic = semanticFallback(target, label);
  if (semantic) return semantic;
  const captureTarget = target.querySelector<HTMLElement>(
    "[data-visual-diagram], .overscroll-contain, .overflow-x-auto.rounded-2xl",
  ) || target;
  const width = Math.max(captureTarget.scrollWidth, captureTarget.clientWidth, 1);
  const height = Math.max(captureTarget.scrollHeight, captureTarget.clientHeight, 1);
  // Les tableaux et les grands diagrammes SVG sont reconstruits en image dédiée.
  // Cela évite les captures vides produites par certains navigateurs sur les zones
  // scrollables, Recharts, PERT, WBS, timelines et chaînes d'audit.
  if (captureTarget.querySelector("table")) {
    const table = tableFallback(captureTarget, label);
    if (table) return table;
  }
  const diagram = await svgFallback(captureTarget, label);
  if (diagram) return diagram;
  try {
    return await html2canvas(captureTarget, {
      backgroundColor: "#ffffff",
      scale: Math.min(2, 12000 / Math.max(width, height)),
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: Math.max(document.documentElement.clientWidth, width),
      windowHeight: Math.max(document.documentElement.clientHeight, height),
      scrollX: 0,
      scrollY: 0,
      onclone: (_document: Document, clone: HTMLElement) => {
        clone.classList.add("project-visual-clone");
        clone.style.width = `${width}px`;
        clone.style.height = `${height}px`;
        clone.style.maxWidth = "none";
        clone.style.maxHeight = "none";
        clone.style.overflow = "visible";
        clone.style.background = "#ffffff";
        clone.querySelectorAll<HTMLElement>("[data-visual-scroll]").forEach((element) => {
          element.style.maxHeight = "none";
          element.style.overflow = "visible";
        });
      },
    } as Parameters<typeof html2canvas>[1]);
  } catch {
    throw new Error("La représentation visuelle ne peut pas être générée.");
  }
}

export default function ProjectVisualActions({ targetRef, fileName, label }: { targetRef: RefObject<HTMLElement | null>; fileName: string; label: string }) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const update = () => setExpanded(document.fullscreenElement === targetRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [targetRef]);

  async function copyVisual() {
    const target = targetRef.current;
    if (!target) return;
    let canvas: HTMLCanvasElement;
    try {
      canvas = await renderTarget(target, label);
    } catch {
      setStatus("idle");
      return;
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));
    if (!blob) return;
    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setStatus("copied");
        window.setTimeout(() => setStatus("idle"), 2500);
        return;
      } catch {
        // Sur localhost ou HTTP, certains navigateurs refusent le presse-papiers image.
      }
    }
    downloadCanvas(canvas, fileName);
    setStatus("downloaded");
    window.setTimeout(() => setStatus("idle"), 2500);
  }

  async function toggleFullscreen() {
    const target = targetRef.current;
    if (!target) return;
    if (document.fullscreenElement === target) await document.exitFullscreen();
    else await target.requestFullscreen?.();
  }

  return <div className="project-visual-actions flex items-center gap-2">{status !== "idle" && <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 shadow-sm">{status === "copied" ? "Copié" : "PNG téléchargé"}</span>}<button type="button" onClick={() => void copyVisual()} title={`Copier ${label}`} aria-label={`Copier ${label}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50"><Copy className="h-4 w-4" /></button><button type="button" onClick={() => void toggleFullscreen()} title={expanded ? `Réduire ${label}` : `Agrandir ${label}`} aria-label={expanded ? `Réduire ${label}` : `Agrandir ${label}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50">{expanded ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}</button></div>;
}
