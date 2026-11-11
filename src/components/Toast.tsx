import { useEffect } from "react";
import Icon from "./Icon";
import { buttonClass } from "../utils/buttonStyles";

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
      className={`fixed top-5 left-1/2 z-[2000] flex max-w-[90vw] items-center gap-2.5 rounded-xl border bg-pb-surface px-5 py-3 shadow-[0_8px_32px_var(--color-pb-shadow)] ${
        isError ? "border-pb-error" : "border-pb-success"
      }`}
      style={{ animation: "toast-slide-in 0.3s ease", transform: "translateX(-50%)" }}
    >
      <Icon
        name={isError ? "alert" : "check"}
        className={`h-4 w-4 ${isError ? "text-pb-error" : "text-pb-success"}`}
      />
      <span className="text-sm font-medium text-pb-text">{message}</span>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onDone();
          }}
          className={`${buttonClass("soft", "sm")} ml-1`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
