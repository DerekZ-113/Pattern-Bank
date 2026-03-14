import { useEffect } from "react";

interface Props {
  message: string;
  isVisible: boolean;
  onDone: () => void;
}

export default function Toast({ message, isVisible, onDone }: Props) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onDone, 2500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDone]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed top-5 left-1/2 z-[2000] flex max-w-[90vw] items-center gap-2.5 rounded-[10px] border border-pb-success bg-pb-surface px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      style={{ animation: "toast-slide-in 0.3s ease", transform: "translateX(-50%)" }}
    >
      <span className="text-base leading-none text-pb-success">✓</span>
      <span className="text-sm font-medium text-pb-text">{message}</span>
    </div>
  );
}
