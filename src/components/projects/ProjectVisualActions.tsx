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

async function svgFallback(target: HTMLElement, label: string) {
  const svg = [...target.querySelectorAll("svg")].sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
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
  const width = Math.max(target.scrollWidth, target.clientWidth, 1);
  const height = Math.max(target.scrollHeight, target.clientHeight, 1);
  try {
    return await html2canvas(target, {
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
    const table = tableFallback(target, label);
    if (table) return table;
    const svg = await svgFallback(target, label);
    if (svg) return svg;
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
