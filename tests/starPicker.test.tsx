// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import StarPicker from "../src/components/StarPicker";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function radios(): HTMLButtonElement[] {
  return screen.getAllByRole("radio") as HTMLButtonElement[];
}

function filledFlags(): boolean[] {
  return radios().map((el) => el.classList.contains("text-pb-star"));
}

describe("StarPicker display mode", () => {
  it("fills stars up to the value and exposes an image label", () => {
    render(<StarPicker mode="display" value={3} />);

    const img = screen.getByRole("img", { name: "3 out of 5 stars" });
    const glyphs = [...img.querySelectorAll("span")];
    expect(glyphs.map((el) => el.classList.contains("text-pb-star"))).toEqual([true, true, true, false, false]);
    expect(glyphs.map((el) => el.classList.contains("text-pb-star-empty"))).toEqual([false, false, false, true, true]);
  });

  it("renders every star empty for a null value with a custom label", () => {
    render(<StarPicker mode="display" value={null} label="No confidence recorded for Two Sum" />);

    const img = screen.getByRole("img", { name: "No confidence recorded for Two Sum" });
    const glyphs = [...img.querySelectorAll("span")];
    expect(glyphs.every((el) => el.classList.contains("text-pb-star-empty"))).toBe(true);
  });
});

describe("StarPicker select mode", () => {
  it("marks only the current value checked and reports clicks through onChange", () => {
    const onChange = vi.fn();
    render(<StarPicker mode="select" value={3} onChange={onChange} />);

    expect(screen.getByRole("radiogroup", { name: "Confidence" })).toBeTruthy();
    expect(radios().map((el) => el.getAttribute("aria-checked"))).toEqual(["false", "false", "true", "false", "false"]);
    expect(filledFlags()).toEqual([true, true, true, false, false]);

    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("previews the hovered rating in the caption and fill, then restores on leave", () => {
    render(<StarPicker mode="select" value={3} onChange={vi.fn()} />);

    expect(screen.getByText("3/5")).toBeTruthy();

    fireEvent.mouseEnter(screen.getByRole("radio", { name: "5 stars" }));
    expect(screen.getByText("5/5")).toBeTruthy();
    expect(filledFlags()).toEqual([true, true, true, true, true]);
    // Hover never changes the recorded value.
    expect(radios().map((el) => el.getAttribute("aria-checked"))).toEqual(["false", "false", "true", "false", "false"]);

    fireEvent.mouseLeave(screen.getByRole("radiogroup"));
    expect(screen.getByText("3/5")).toBeTruthy();
    expect(filledFlags()).toEqual([true, true, true, false, false]);
  });

  it("fires onChange even when the already-selected star is clicked", () => {
    const onChange = vi.fn();
    render(<StarPicker mode="select" value={3} onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "3 stars" }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});

describe("StarPicker commit mode", () => {
  it("renders every star empty until hovered when nothing is recorded", () => {
    render(<StarPicker mode="commit" value={null} onCommit={vi.fn()} />);

    expect(filledFlags()).toEqual([false, false, false, false, false]);
    expect(radios().every((el) => el.getAttribute("aria-checked") === "false")).toBe(true);

    fireEvent.mouseEnter(screen.getByRole("radio", { name: "4 stars" }));
    expect(filledFlags()).toEqual([true, true, true, true, false]);
  });

  it("checks only the recorded value and applies custom labels", () => {
    render(
      <StarPicker
        mode="commit"
        value={3}
        onCommit={vi.fn()}
        label="Rate Two Sum confidence"
        getStarLabel={(star) => `Rate Two Sum with ${star}-star confidence`}
      />
    );

    expect(screen.getByRole("radiogroup", { name: "Rate Two Sum confidence" })).toBeTruthy();
    const third = screen.getByRole("radio", { name: "Rate Two Sum with 3-star confidence" });
    expect(third.getAttribute("aria-checked")).toBe("true");
    expect(radios().filter((el) => el.getAttribute("aria-checked") === "true")).toHaveLength(1);
  });

  it("commits on click and disables every star while the commit is pending", async () => {
    const pending = deferred<void>();
    const onCommit = vi.fn(() => pending.promise);
    render(<StarPicker mode="commit" value={null} onCommit={onCommit} />);

    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onCommit).toHaveBeenCalledWith(4);
    expect(radios().every((el) => el.disabled)).toBe(true);
    // The pending star stays lit so the user sees what they picked.
    expect(filledFlags()).toEqual([true, true, true, true, false]);

    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));
    expect(onCommit).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    expect(radios().every((el) => !el.disabled)).toBe(true);
  });

  it("re-enables and warns when the commit rejects", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const pending = deferred<void>();
    render(<StarPicker mode="commit" value={null} onCommit={() => pending.promise} />);

    fireEvent.click(screen.getByRole("radio", { name: "2 stars" }));
    expect(radios().every((el) => el.disabled)).toBe(true);

    await act(async () => {
      pending.reject(new Error("offline"));
      await pending.promise.catch(() => undefined);
    });
    expect(warn).toHaveBeenCalledWith("Rating failed:", expect.any(Error));
    expect(radios().every((el) => !el.disabled)).toBe(true);
    warn.mockRestore();
  });

  it("previews on focus and clears on blur", () => {
    render(<StarPicker mode="commit" value={null} onCommit={vi.fn()} />);

    fireEvent.focus(screen.getByRole("radio", { name: "2 stars" }));
    expect(filledFlags()).toEqual([true, true, false, false, false]);

    fireEvent.blur(screen.getByRole("radio", { name: "2 stars" }));
    expect(filledFlags()).toEqual([false, false, false, false, false]);
  });

  it("moves focus with arrow keys without committing", () => {
    const onCommit = vi.fn();
    render(<StarPicker mode="commit" value={null} onCommit={onCommit} />);

    const second = screen.getByRole("radio", { name: "2 stars" });
    second.focus();
    fireEvent.keyDown(second, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "3 stars" }));

    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(second);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("blocks clicks while disabled", () => {
    const onCommit = vi.fn();
    render(<StarPicker mode="commit" value={null} onCommit={onCommit} disabled />);

    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onCommit).not.toHaveBeenCalled();
    expect(radios().every((el) => el.disabled)).toBe(true);
  });

  it("keeps the pinned lg geometry classes", () => {
    render(<StarPicker mode="commit" value={null} onCommit={vi.fn()} />);

    const first = screen.getByRole("radio", { name: "1 star" });
    expect(first.className).toContain("h-7");
    expect(first.className).toContain("w-7");
    expect(first.className).toContain("text-[19px]");
  });
});
