import { useEffect } from "react";

interface Props {
  message: string;
  isVisible: boolean;
  onDone: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "success" | "error";
}

export default function Toast({ message, isVisible, onDone, action, variant = "success" }: Props) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onDone, 2500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDone]);

  if (!isVisible) return null;

  const isError = variant === "error";

  return (
    <div
      className={`fixed top-5 left-1/2 z-[2000] flex max-w-[90vw] items-center gap-2.5 rounded-[10px] border bg-pb-surface px-5 py-3 shadow-[0_8px_32px_var(--color-pb-shadow)] ${
        isError ? "border-pb-hard" : "border-pb-success"
      }`}
      style={{ animation: "toast-slide-in 0.3s ease", transform: "translateX(-50%)" }}
    >
      <span className={`text-base leading-none ${isError ? "text-pb-hard" : "text-pb-success"}`}>
        {isError ? "!" : "✓"}
      </span>
      <span className="text-sm font-medium text-pb-text">{message}</span>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onDone();
          }}
          className="ml-1 cursor-pointer rounded-md border border-pb-border bg-pb-surface-2 px-2.5 py-1 text-xs font-semibold text-pb-accent transition-colors hover:border-pb-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pb-accent"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
