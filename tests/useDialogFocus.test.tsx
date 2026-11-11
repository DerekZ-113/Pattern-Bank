// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import useDialogFocus from "../src/hooks/useDialogFocus";

function Dialog({ isOpen, children }: { isOpen: boolean; children?: ReactNode }) {
  const panelRef = useDialogFocus<HTMLDivElement>(isOpen);
  if (!isOpen) return null;
  return (
    <div ref={panelRef} tabIndex={-1} role="dialog" aria-label="Test dialog">
      <button type="button">Inside</button>
      {children}
    </div>
  );
}

function Page({ isOpen, children }: { isOpen: boolean; children?: ReactNode }) {
  return (
    <>
      <button type="button">Opener</button>
      <button type="button">Elsewhere</button>
      <Dialog isOpen={isOpen}>{children}</Dialog>
    </>
  );
}

describe("useDialogFocus", () => {
  it("moves focus into the dialog when it opens", () => {
    const { rerender } = render(<Page isOpen={false} />);
    screen.getByRole("button", { name: "Opener" }).focus();

    rerender(<Page isOpen />);

    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("hands focus back to the opener when it closes", () => {
    const { rerender } = render(<Page isOpen={false} />);
    const opener = screen.getByRole("button", { name: "Opener" });
    opener.focus();

    rerender(<Page isOpen />);
    screen.getByRole("button", { name: "Inside" }).focus();
    rerender(<Page isOpen={false} />);

    expect(document.activeElement).toBe(opener);
  });

  it("brings focus back when it leaves the dialog", () => {
    render(<Page isOpen />);

    screen.getByRole("button", { name: "Elsewhere" }).focus();

    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("lets focus move freely inside the dialog", () => {
    render(<Page isOpen />);
    const inside = screen.getByRole("button", { name: "Inside" });

    inside.focus();

    expect(document.activeElement).toBe(inside);
  });

  // Settings stays open underneath the reschedule confirmation; it must not
  // steal focus back from the dialog stacked on top of it.
  it("leaves focus alone in a dialog stacked on top", () => {
    render(
      <>
        <Page isOpen />
        <div role="alertdialog" aria-label="Confirm">
          <button type="button">Confirm action</button>
        </div>
      </>
    );
    const confirm = screen.getByRole("button", { name: "Confirm action" });

    confirm.focus();

    expect(document.activeElement).toBe(confirm);
  });

  it("leaves focus alone in a toast action", () => {
    render(
      <>
        <Page isOpen />
        <div role="status">
          <button type="button">Undo</button>
        </div>
      </>
    );
    const undo = screen.getByRole("button", { name: "Undo" });

    undo.focus();

    expect(document.activeElement).toBe(undo);
  });

  it("does not take focus from a child that focused itself on mount", () => {
    render(
      <Page isOpen>
        <input aria-label="Search" autoFocus />
      </Page>
    );

    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Search" }));
  });

  it("does not throw if the opener is gone by the time it closes", () => {
    function Vanishing({ isOpen }: { isOpen: boolean }) {
      return (
        <>
          {!isOpen ? null : <Dialog isOpen />}
          {isOpen ? null : <button type="button">Reopened</button>}
        </>
      );
    }
    const { rerender } = render(<Vanishing isOpen={false} />);
    screen.getByRole("button", { name: "Reopened" }).focus();

    rerender(<Vanishing isOpen />);
    expect(() => rerender(<Vanishing isOpen={false} />)).not.toThrow();
  });
});
