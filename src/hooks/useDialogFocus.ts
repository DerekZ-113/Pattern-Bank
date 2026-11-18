import { useEffect, useRef } from "react";

// Focus may sit in a dialog stacked on top of this one (the confirm dialog
// over Settings) or in a toast's action button without being "escaped".
const ELSEWHERE_ALLOWED = '[role="dialog"], [role="alertdialog"], [role="status"], [role="alert"]';

/**
 * Focus management for a modal panel, so `aria-modal` is a promise the
 * keyboard actually keeps:
 *   - focus moves into the panel when it opens,
 *   - focus that leaves the panel is brought back,
 *   - closing hands focus back to whatever opened it.
 *
 * Attach the returned ref to the panel and give it `tabIndex={-1}`.
 */
export default function useDialogFocus<T extends HTMLElement>(isOpen: boolean) {
  const panelRef = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Respect a child that focused itself while mounting.
    if (!panel.contains(document.activeElement)) panel.focus();

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || panel.contains(target)) return;
      if (target.closest(ELSEWHERE_ALLOWED)) return;
      panel.focus();
    };
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  return panelRef;
}
