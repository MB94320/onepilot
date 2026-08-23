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

function textFallback(target: HTMLElement, label: string) {
  const lines = target.innerText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = Math.max(480, Math.min(12000, 120 + lines.length * 28));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponible");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0f172a";
  context.font = "700 26px Arial";
  context.fillText(label, 40, 48);
  context.font = "14px Arial";
  lines.slice(0, 400).forEach((line, index) => {
    context.fillStyle = index % 2 ? "#334155" : "#0f172a";
    context.fillText(line.slice(0, 210), 40, 92 + index * 28);
  });
  return canvas;
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
    return textFallback(target, label);
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
    const canvas = await renderTarget(target, label);
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
