// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import TodayDoneFeed from "../src/components/TodayDoneFeed";
import type { TodayActivityFeedItem } from "@patternbank/core";

type SolveItem = Extract<TodayActivityFeedItem, { type: "leetcode_solve" }>;

function makeSolveItem(overrides: Partial<SolveItem> = {}): SolveItem {
  return {
    type: "leetcode_solve",
    id: "lc-1",
    submissionDbId: "sub-1",
    problemId: "p1",
    title: "Two Sum",
    leetcodeNumber: 1,
    difficulty: "Easy",
    submittedAt: "2026-06-30T21:30:00.000Z",
    status: "linked_existing",
    reviewDue: true,
    canRate: true,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const twoItems = () => [
  makeSolveItem(),
  makeSolveItem({ id: "lc-2", submissionDbId: "sub-2", problemId: "p2", title: "Add Two Numbers", leetcodeNumber: 2, difficulty: "Medium" }),
];

describe("TodayDoneFeed rating lock (F-21)", () => {
  it("rates a review-due row with the chosen confidence", async () => {
    const onRate = vi.fn().mockResolvedValue(undefined);
    render(<TodayDoneFeed items={[makeSolveItem()]} onRateLeetCodeReview={onRate} />);

    fireEvent.click(screen.getByRole("button", { name: "Rate Two Sum" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: "Rate Two Sum with 4-star confidence" }));
    });

    expect(onRate).toHaveBeenCalledTimes(1);
    expect(onRate).toHaveBeenCalledWith("sub-1", "p1", 4);
  });

  it("lets the second row be rated after the first rating completes", async () => {
    const first = deferred<void>();
    const onRate = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
    render(<TodayDoneFeed items={twoItems()} onRateLeetCodeReview={onRate} />);

    fireEvent.click(screen.getByRole("button", { name: "Rate Two Sum" }));
    fireEvent.click(screen.getByRole("radio", { name: "Rate Two Sum with 4-star confidence" }));
    await act(async () => {
      first.resolve();
      await first.promise;
    });

    fireEvent.click(screen.getByRole("button", { name: "Rate Add Two Numbers" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: "Rate Add Two Numbers with 5-star confidence" }));
    });

    expect(onRate).toHaveBeenCalledTimes(2);
    expect(onRate).toHaveBeenLastCalledWith("sub-2", "p2", 5);
  });

  it("blocks other rows while a rating is still in flight", async () => {
    const first = deferred<void>();
    const onRate = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
    render(<TodayDoneFeed items={twoItems()} onRateLeetCodeReview={onRate} />);

    fireEvent.click(screen.getByRole("button", { name: "Rate Two Sum" }));
    fireEvent.click(screen.getByRole("radio", { name: "Rate Two Sum with 3-star confidence" }));

    // First rating still pending: the second row's stars must not fire.
    fireEvent.click(screen.getByRole("button", { name: "Rate Add Two Numbers" }));
    fireEvent.click(screen.getByRole("radio", { name: "Rate Add Two Numbers with 4-star confidence" }));
    expect(onRate).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve();
      await first.promise;
    });
  });

  it("releases the lock when the rating callback rejects", async () => {
    const first = deferred<void>();
    const onRate = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      render(<TodayDoneFeed items={[makeSolveItem()]} onRateLeetCodeReview={onRate} />);

      fireEvent.click(screen.getByRole("button", { name: "Rate Two Sum" }));
      fireEvent.click(screen.getByRole("radio", { name: "Rate Two Sum with 2-star confidence" }));
      await act(async () => {
        first.reject(new Error("rating failed"));
        await first.promise.catch(() => undefined);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("radio", { name: "Rate Two Sum with 4-star confidence" }));
      });

      expect(onRate).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("TodayDoneFeed title click-through", () => {
  it("renders titles as buttons that report the problemId when the callback is provided", () => {
    const onOpenProblemDetails = vi.fn();
    render(
      <TodayDoneFeed
        items={twoItems()}
        onRateLeetCodeReview={vi.fn()}
        onOpenProblemDetails={onOpenProblemDetails}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Two Sum" }));
    expect(onOpenProblemDetails).toHaveBeenCalledTimes(1);
    expect(onOpenProblemDetails).toHaveBeenCalledWith("p1");
  });

  it("renders plain text titles without the callback", () => {
    render(<TodayDoneFeed items={twoItems()} onRateLeetCodeReview={vi.fn()} />);

    expect(screen.getByText("Two Sum")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Two Sum" })).toBeNull();
  });

  it("keeps title clicks working independently of an in-flight rating", async () => {
    const gate = deferred<void>();
    const onRate = vi.fn(() => gate.promise);
    const onOpenProblemDetails = vi.fn();
    render(
      <TodayDoneFeed
        items={twoItems()}
        onRateLeetCodeReview={onRate}
        onOpenProblemDetails={onOpenProblemDetails}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Rate Two Sum" }));
    fireEvent.click(screen.getByRole("radio", { name: "Rate Two Sum with 4-star confidence" }));
    expect(onRate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Add Two Numbers" }));
    expect(onOpenProblemDetails).toHaveBeenCalledWith("p2");
    expect(onRate).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
  });
});
