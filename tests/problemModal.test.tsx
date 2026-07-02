// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import ProblemModal from "../src/components/ProblemModal";
import type { Problem } from "../src/types";

// ReviewHistory pulls in useAuth + the supabase client; irrelevant here.
vi.mock("../src/components/ReviewHistory", () => ({
  default: () => null,
}));

function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: "p1",
    title: "Original Title",
    leetcodeNumber: null,
    url: null,
    difficulty: "Medium",
    patterns: ["Hash Table"],
    confidence: 4,
    notes: "original notes",
    excludeFromReview: false,
    dateAdded: "2026-06-01",
    lastReviewed: null,
    nextReviewDate: "2026-06-10",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderModal(initialProps: Partial<Parameters<typeof ProblemModal>[0]> = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    initialData: null as Problem | null,
  };
  const props = { ...defaults, ...initialProps };
  const utils = render(<ProblemModal {...props} />);
  return {
    ...utils,
    rerenderModal: (next: Partial<Parameters<typeof ProblemModal>[0]>) =>
      utils.rerender(<ProblemModal {...props} {...next} />),
  };
}

const titleInput = () => screen.getByPlaceholderText("e.g. Two Sum") as HTMLInputElement;

describe("ProblemModal stale form state (F-22)", () => {
  it("shows fresh values when reopened for the same problem after an abandoned edit", () => {
    const problem = makeProblem();
    const { rerenderModal } = renderModal({ initialData: problem });

    fireEvent.change(titleInput(), { target: { value: "Abandoned Draft" } });
    expect(titleInput().value).toBe("Abandoned Draft");

    rerenderModal({ isOpen: false });
    rerenderModal({ isOpen: true });

    expect(titleInput().value).toBe("Original Title");
  });

  it("saves the problem's current confidence after an abandoned confidence edit", () => {
    const onSave = vi.fn();
    const problem = makeProblem({ confidence: 4 });
    const { rerenderModal } = renderModal({ initialData: problem, onSave });

    fireEvent.click(screen.getByRole("radio", { name: "2 stars" }));
    rerenderModal({ isOpen: false });
    rerenderModal({ isOpen: true });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const [saved, confidenceChanged] = onSave.mock.calls[0];
    expect(saved.confidence).toBe(4);
    expect(confidenceChanged).toBe(false);
  });

  it("discards a canceled add-mode draft on reopen", () => {
    const { rerenderModal } = renderModal({ initialData: null });

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.change(titleInput(), { target: { value: "Draft Problem" } });

    rerenderModal({ isOpen: false });
    rerenderModal({ isOpen: true });

    // Back to the default LeetCode mode (no custom title input rendered)...
    expect(screen.queryByPlaceholderText("e.g. Two Sum")).toBeNull();
    // ...and the draft title is gone after switching to custom again.
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    expect(titleInput().value).toBe("");
  });

  it("resets to an empty add form after editing a problem (edit → add)", () => {
    const problem = makeProblem();
    const { rerenderModal } = renderModal({ initialData: problem });
    expect(screen.getByText("Problem Details")).toBeTruthy();

    rerenderModal({ isOpen: false });
    rerenderModal({ isOpen: true, initialData: null });

    expect(screen.getByText("Add New Problem")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    expect(titleInput().value).toBe("");
  });
});
