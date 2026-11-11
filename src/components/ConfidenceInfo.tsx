import { useState, useEffect, useRef } from "react";
import { INTERVALS } from "@patternbank/core";
import type { Confidence } from "../types";
import Icon from "./Icon";
import { iconButtonClass } from "../utils/buttonStyles";

export default function ConfidenceInfo() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClose = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handleClose);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Confidence info"
        aria-expanded={open}
        className={iconButtonClass("sm")}
      >
        <Icon name="help" />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-50 w-52 rounded-lg border border-pb-border bg-pb-surface p-3 shadow-[0_8px_32px_var(--color-pb-shadow)]">
          <p className="mb-2 text-xs font-semibold text-pb-text-muted">
            Review schedule
          </p>
          <div className="flex flex-col gap-1">
            {([1, 2, 3, 4, 5] as Confidence[]).map((stars) => (
              <div key={stars} className="flex items-center justify-between text-xs">
                <span className="text-pb-star">
                  {"★".repeat(stars)}
                  {"☆".repeat(5 - stars)}
                </span>
                <span className="text-pb-text-muted">
                  {INTERVALS[stars]}d
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs leading-snug text-pb-text-dim">
            5-star reviews can graduate longer.
          </p>
        </div>
      )}
    </span>
  );
}
