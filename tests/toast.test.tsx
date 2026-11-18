// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import Toast from "../src/components/Toast";

describe("Toast", () => {
  it("announces a normal toast politely", () => {
    render(<Toast message="Problem added" isVisible onDone={vi.fn()} />);

    expect(screen.getByRole("status").textContent).toContain("Problem added");
  });

  it("announces an error assertively", () => {
    render(<Toast message="Import failed" isVisible onDone={vi.fn()} variant="error" />);

    expect(screen.getByRole("alert").textContent).toContain("Import failed");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders nothing while hidden", () => {
    render(<Toast message="Problem added" isVisible={false} onDone={vi.fn()} />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
