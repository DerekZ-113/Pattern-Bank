// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NavBar from "../src/components/NavBar";

describe("NavBar", () => {
  it("renders Today, Progress, and Problems", () => {
    render(<NavBar activeTab="dashboard" onTabChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Today/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Progress/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Problems$/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /All Problems/i })).toBeNull();
  });

  it("marks the active tab with aria-current", () => {
    render(<NavBar activeTab="dashboard" onTabChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Today/i }).getAttribute("aria-current")).toBe("page");
  });

  it("does not render Add Problem as a nav item", () => {
    render(<NavBar activeTab="dashboard" onTabChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /Add Problem/i })).toBeNull();
  });
});
