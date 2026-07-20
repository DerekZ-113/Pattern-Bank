// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DailyGoalSection from "../src/components/DailyGoalSection";
import type { Preferences } from "../src/types";

function makePrefs(goal: number): Preferences {
  return {
    dailyReviewGoal: goal,
    hidePatternsDuringReview: false,
    enabledExtraPatterns: [],
  };
}

function renderSection({
  goal = 5,
  upcomingScheduleInfo = null,
  onUpdatePreferences = vi.fn<(updates: Partial<Preferences>) => void>(),
  onRequestRespread = vi.fn<() => void>(),
}: {
  goal?: number;
  upcomingScheduleInfo?: { count: number; currentPace: number } | null;
  onUpdatePreferences?: ReturnType<typeof vi.fn<(updates: Partial<Preferences>) => void>>;
  onRequestRespread?: ReturnType<typeof vi.fn<() => void>>;
} = {}) {
  render(
    <DailyGoalSection
      preferences={makePrefs(goal)}
      onUpdatePreferences={onUpdatePreferences}
      upcomingScheduleInfo={upcomingScheduleInfo}
      onRequestRespread={onRequestRespread}
    />
  );
  return { onUpdatePreferences, onRequestRespread };
}

describe("DailyGoalSection", () => {
  it("renders the goal as an editable numeric input", () => {
    renderSection({ goal: 5 });
    const input = screen.getByLabelText<HTMLInputElement>(/daily review goal/i);
    expect(input.value).toBe("5");
  });

  it("commits a typed value on blur", () => {
    const { onUpdatePreferences } = renderSection({ goal: 5 });
    const input = screen.getByLabelText(/daily review goal/i);
    fireEvent.change(input, { target: { value: "15" } });
    fireEvent.blur(input);
    expect(onUpdatePreferences).toHaveBeenCalledWith({ dailyReviewGoal: 15 });
  });

  it("commits a typed value on Enter", () => {
    const { onUpdatePreferences } = renderSection({ goal: 5 });
    const input = screen.getByLabelText(/daily review goal/i);
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onUpdatePreferences).toHaveBeenCalledWith({ dailyReviewGoal: 12 });
  });

  it("clamps typed values above 20 down to 20", () => {
    const { onUpdatePreferences } = renderSection({ goal: 5 });
    const input = screen.getByLabelText<HTMLInputElement>(/daily review goal/i);
    fireEvent.change(input, { target: { value: "50" } });
    fireEvent.blur(input);
    expect(onUpdatePreferences).toHaveBeenCalledWith({ dailyReviewGoal: 20 });
    expect(input.value).toBe("20");
  });

  it("clamps typed values below 1 up to 1", () => {
    const { onUpdatePreferences } = renderSection({ goal: 5 });
    const input = screen.getByLabelText(/daily review goal/i);
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(onUpdatePreferences).toHaveBeenCalledWith({ dailyReviewGoal: 1 });
  });

  it("restores the current goal when the input is emptied", () => {
    const { onUpdatePreferences } = renderSection({ goal: 5 });
    const input = screen.getByLabelText<HTMLInputElement>(/daily review goal/i);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onUpdatePreferences).not.toHaveBeenCalled();
    expect(input.value).toBe("5");
  });

  it("steppers still adjust the goal by one", () => {
    const { onUpdatePreferences } = renderSection({ goal: 5 });
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(onUpdatePreferences).toHaveBeenCalledWith({ dailyReviewGoal: 6 });
    fireEvent.click(screen.getByRole("button", { name: "−" }));
    expect(onUpdatePreferences).toHaveBeenCalledWith({ dailyReviewGoal: 4 });
  });

  it("shows the reschedule affordance when upcoming pace lags the goal", () => {
    renderSection({ goal: 15, upcomingScheduleInfo: { count: 130, currentPace: 3 } });
    expect(screen.getByText(/130 upcoming problems are paced at ~3\/day/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Reschedule at 15\/day/i })).toBeTruthy();
  });

  it("fires onRequestRespread without touching preferences when the button is pressed", () => {
    const { onUpdatePreferences, onRequestRespread } = renderSection({
      goal: 15,
      upcomingScheduleInfo: { count: 130, currentPace: 3 },
    });
    fireEvent.click(screen.getByRole("button", { name: /Reschedule at 15\/day/i }));
    expect(onRequestRespread).toHaveBeenCalledTimes(1);
    expect(onUpdatePreferences).not.toHaveBeenCalled();
  });

  it("hides the affordance when there is nothing upcoming", () => {
    renderSection({ goal: 15, upcomingScheduleInfo: null });
    expect(screen.queryByRole("button", { name: /Reschedule/i })).toBeNull();
  });

  it("hides the affordance when the pace already meets the goal", () => {
    renderSection({ goal: 3, upcomingScheduleInfo: { count: 130, currentPace: 3 } });
    expect(screen.queryByRole("button", { name: /Reschedule/i })).toBeNull();
  });

  it("hides the affordance when the goal drops below the current pace", () => {
    renderSection({ goal: 2, upcomingScheduleInfo: { count: 130, currentPace: 3 } });
    expect(screen.queryByRole("button", { name: /Reschedule/i })).toBeNull();
  });
});
