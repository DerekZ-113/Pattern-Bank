import { useLayoutEffect, useRef, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onExited: () => void;
  className?: string;
  durationMs?: number;
  opacityMs?: number;
  cleanupMs?: number;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function CollapsingListItem({
  children,
  onExited,
  className,
  durationMs = 220,
  opacityMs = 180,
  cleanupMs = 240,
}: Props) {
  const itemRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      onExited();
      return undefined;
    }

    const element = itemRef.current;
    if (!element) {
      onExited();
      return undefined;
    }

    const height = element.offsetHeight;
    element.style.height = `${height}px`;
    element.style.opacity = "1";
    element.style.transform = "translateY(0)";
    element.style.overflow = "hidden";
    element.style.transition = [
      `opacity ${opacityMs}ms ease`,
      `transform ${durationMs}ms ease`,
      `height ${durationMs}ms ease`,
      `margin ${durationMs}ms ease`,
      `padding ${durationMs}ms ease`,
      `border-width ${durationMs}ms ease`,
    ].join(", ");

    const collapse = () => {
      element.style.opacity = "0";
      element.style.transform = "translateY(-4px)";
      element.style.height = "0px";
      element.style.marginTop = "0px";
      element.style.marginBottom = "0px";
      element.style.paddingTop = "0px";
      element.style.paddingBottom = "0px";
      element.style.borderWidth = "0px";
    };

    if (typeof window.requestAnimationFrame === "function") {
      rafRef.current = window.requestAnimationFrame(collapse);
    } else {
      collapse();
    }

    timerRef.current = window.setTimeout(onExited, cleanupMs);

    return () => {
      if (rafRef.current !== null && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [cleanupMs, durationMs, opacityMs, onExited]);

  return (
    <div
      ref={itemRef}
      aria-hidden="true"
      className={className}
      style={{ overflow: "hidden", pointerEvents: "none" }}
    >
      {children}
    </div>
  );
}
