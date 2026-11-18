// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import HelpModal from "../src/components/HelpModal";

describe("HelpModal", () => {
  it("is announced as a modal dialog named Help", () => {
    render(<HelpModal isOpen onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Help" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("closes from its close button", () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close help" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(<HelpModal isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
