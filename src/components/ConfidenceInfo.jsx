import { useState, useEffect, useRef } from "react";
import { INTERVALS } from "../utils/spacedRepetition";

export default function ConfidenceInfo() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClose = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => { if (e.key === "Escape") setOpen(false); };
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
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-pb-border bg-transparent text-[10px] leading-none text-pb-text-muted hover:border-pb-text-muted hover:text-pb-text"
        aria-label="Confidence info"
      >
        ?
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-50 w-52 rounded-lg border border-pb-border bg-pb-surface p-3 shadow-lg">
          <p className="mb-2 text-[11px] font-semibold text-pb-text-muted">
            Review Schedule
          </p>
          <div className="flex flex-col gap-1">
            {[1, 2, 3, 4, 5].map((stars) => (
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
        </div>
      )}
    </span>
  );
}
