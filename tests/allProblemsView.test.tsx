// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import AllProblemsView from "../src/components/AllProblemsView";
import type { Problem } from "../src/types";

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "problem-1",
    title: "Two Sum",
    leetcodeNumber: 1,
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    patterns: ["Hash Table"],
    confidence: 4,
    notes: "Use a hash map for complements.",
    excludeFromReview: false,
    dateAdded: "2026-05-01",
    lastReviewed: "2026-05-10",
    nextReviewDate: "2999-01-01",
    updatedAt: "2026-05-10T12:00:00.000Z",
    ...overrides,
  };
}

const problems: Problem[] = [
  makeProblem(),
  makeProblem({
    id: "problem-2",
    title: "Number of Islands",
    leetcodeNumber: 200,
    difficulty: "Medium",
    patterns: ["Graph", "DFS"],
    confidence: 5,
    notes: "",
    nextReviewDate: "2000-01-01",
  }),
  makeProblem({
    id: "problem-3",
    title: "Word Ladder",
    leetcodeNumber: 127,
    difficulty: "Hard",
    patterns: ["Graph", "BFS", "Hash Table"],
    confidence: 1,
    excludeFromReview: true,
    nextReviewDate: "2000-01-01",
  }),
];

function renderAllProblems(overrides: Partial<ComponentProps<typeof AllProblemsView>> = {}) {
  const props: ComponentProps<typeof AllProblemsView> = {
    problems,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleExclude: vi.fn(),
    onAddClick: vi.fn(),
    enabledExtraPatterns: [],
    ...overrides,
  };

  render(<AllProblemsView {...props} />);
  return props;
}

describe("AllProblemsView", () => {
  it("renders the Claude-style shell, search, filters, and results count", () => {
    renderAllProblems();

    expect(screen.getByRole("heading", { name: "All Problems", level: 1 })).toBeTruthy();
    expect(screen.getByText(/Browse and maintain your library/)).toBeTruthy();
    expect(screen.getByText("3 problems")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Problem" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Search by title, number, or notes…")).toBeTruthy();
    expect(screen.getByLabelText("Pattern")).toBeTruthy();
    expect(screen.getByLabelText("Difficulty")).toBeTruthy();
    expect(screen.getByLabelText("Confidence")).toBeTruthy();
    expect(screen.getByLabelText("Status")).toBeTruthy();
    expect(screen.getByLabelText("Sort")).toBeTruthy();
    expect(screen.getByText(/Showing/).textContent).toContain("3");
    expect(screen.getByText(/Showing/).textContent).toContain("of");
  });

  it("shows active filter styling and clears filters", () => {
    renderAllProblems();

    fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "Medium" } });

    const difficultyFilter = screen.getByLabelText("Difficulty").closest("[data-active-filter]");
    expect(difficultyFilter?.getAttribute("data-active-filter")).toBe("true");
    expect(screen.getByText(/Showing/).textContent).toContain("1");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters ×" }));

    expect((screen.getByLabelText("Difficulty") as HTMLSelectElement).value).toBe("all");
    expect(screen.getByText(/Showing/).textContent).toContain("3");
  });

  it("notifies the parent when the sort changes", () => {
    const onSortChange = vi.fn();
    renderAllProblems({ onSortChange });

    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "confidence" } });

    expect(onSortChange).toHaveBeenCalledWith("confidence");
    expect((screen.getByLabelText("Sort") as HTMLSelectElement).value).toBe("confidence");
  });

  it("lists Database in the pattern filter when enabled or in use", () => {
    const { unmount } = render(
      <AllProblemsView
        problems={problems}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleExclude={vi.fn()}
        onAddClick={vi.fn()}
        enabledExtraPatterns={["Database"]}
      />
    );
    expect(within(screen.getByLabelText("Pattern")).getByRole("option", { name: "Database" })).toBeTruthy();
    unmount();

    const { unmount: unmountInUse } = render(
      <AllProblemsView
        problems={[makeProblem({ id: "db-1", title: "Combine Two Tables", patterns: ["Database"] })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleExclude={vi.fn()}
        onAddClick={vi.fn()}
        enabledExtraPatterns={[]}
      />
    );
    expect(within(screen.getByLabelText("Pattern")).getByRole("option", { name: "Database" })).toBeTruthy();
    unmountInUse();

    renderAllProblems();
    expect(within(screen.getByLabelText("Pattern")).queryByRole("option", { name: "Database" })).toBeNull();
  });

  it("shows Sort first and defaults its first option to Problem Index", () => {
    renderAllProblems();

    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(selects[0].getAttribute("aria-label")).toBe("Sort");

    const sort = screen.getByLabelText("Sort") as HTMLSelectElement;
    expect(sort.options[0].value).toBe("leetcodeNumber");
    expect(sort.options[0].textContent).toBe("Problem Index (Low → High)");
    expect(sort.value).toBe("leetcodeNumber");
  });

  it("renders compact problem cards with title-first labels and review states", () => {
    renderAllProblems();

    const twoSumRow = screen.getByText("Two Sum").closest("article")!;
    expect(within(twoSumRow).getByText("#1")).toBeTruthy();
    expect(twoSumRow.textContent?.indexOf("Two Sum")).toBeLessThan(twoSumRow.textContent?.indexOf("#1") ?? 0);
    expect(within(twoSumRow).getByText(/Next review:/)).toBeTruthy();
    expect(within(twoSumRow).queryByText("Use a hash map for complements.")).toBeNull();
    expect(within(twoSumRow).queryByText("Open on LeetCode →")).toBeNull();

    const dueRow = screen.getByText("Number of Islands").closest("article")!;
    expect(within(dueRow).getByText("Due for review")).toBeTruthy();

    const excludedRow = screen.getByText("Word Ladder").closest("article")!;
    expect(within(excludedRow).getByText("Excluded from reviews")).toBeTruthy();
  });

  it("keeps card edit, exclude, and delete interactions isolated", () => {
    const { onEdit, onDelete, onToggleExclude } = renderAllProblems();

    const twoSumRow = screen.getByText("Two Sum").closest("article")!;
    fireEvent.click(twoSumRow);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "problem-1" }));

    fireEvent.click(within(twoSumRow).getByRole("button", { name: "Exclude from review" }));
    expect(onToggleExclude).toHaveBeenCalledWith("problem-1");
    expect(onEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(within(twoSumRow).getByRole("button", { name: "Delete problem" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "problem-1" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
