"use client";

import { useEffect, useState, type RefObject } from "react";
import html2canvas from "html2canvas";
import { Copy, Expand, Minimize2 } from "lucide-react";

export default function ProjectVisualActions({ targetRef, fileName, label }: { targetRef: RefObject<HTMLElement | null>; fileName: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "downloaded" | "failed">("idle");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const update = () => setExpanded(document.fullscreenElement === targetRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [targetRef]);

  async function copyVisual() {
    const target = targetRef.current;
    if (!target) return;
    try {
      const canvas = await html2canvas(target, { background: "#ffffff", scale: 2, useCORS: true, logging: false } as any);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));
      if (!blob) throw new Error("Capture impossible");
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setStatus("copied");
      } else {
        const link = document.createElement("a"); link.download = `${fileName}.png`; link.href = canvas.toDataURL("image/png", 1); link.click(); setStatus("downloaded");
      }
    } catch {
      setStatus("failed");
    } finally {
      window.setTimeout(() => setStatus("idle"), 2500);
    }
  }

  async function toggleFullscreen() {
    const target = targetRef.current;
    if (!target) return;
    if (document.fullscreenElement === target) await document.exitFullscreen();
    else await target.requestFullscreen?.();
  }

  return <div className="flex items-center gap-2">{status !== "idle" && <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 shadow-sm dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100">{status === "copied" ? "Copié" : status === "downloaded" ? "PNG téléchargé" : "Copie impossible"}</span>}<button type="button" onClick={() => void copyVisual()} title={`Copier ${label}`} aria-label={`Copier ${label}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-700 dark:text-indigo-200"><Copy className="h-4 w-4" /></button><button type="button" onClick={() => void toggleFullscreen()} title={expanded ? `Réduire ${label}` : `Agrandir ${label}`} aria-label={expanded ? `Réduire ${label}` : `Agrandir ${label}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-700 dark:text-indigo-200">{expanded ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}</button></div>;
}
