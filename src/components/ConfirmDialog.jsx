import { useEffect } from "react";

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
  destructive = true,
}) {
  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-[380px] rounded-[14px] border border-pb-border bg-pb-surface">
        <div className="px-6 py-5">
          <h3 className="mb-2 text-base font-semibold text-pb-text">{title}</h3>
          <p className="text-sm leading-relaxed text-pb-text-muted">{message}</p>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-pb-border px-6 py-3.5">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-pb-border bg-transparent px-[18px] py-2 text-[13px] font-semibold text-pb-text-muted hover:border-pb-text-muted"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`cursor-pointer rounded-lg border-none px-[18px] py-2 text-[13px] font-semibold text-white hover:opacity-85 ${
              destructive ? "bg-pb-hard" : "bg-pb-accent"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
