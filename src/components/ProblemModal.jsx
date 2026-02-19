import { useState, useEffect, useCallback } from "react";
import { PATTERNS, PATTERN_COLORS, DIFFICULTIES } from "../utils/constants";
import { todayStr, addDays, generateId } from "../utils/dateHelpers";
import { getIntervalDays } from "../utils/spacedRepetition";
import StarRating from "./StarRating";
import InlineError from "./InlineError";
import LeetCodeSearch from "./LeetCodeSearch";

export default function ProblemModal({ isOpen, onClose, onSave, initialData }) {
  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);
  const isEdit = !!initialData;
  const [mode, setMode] = useState("leetcode"); // "leetcode" or "custom"
  const [form, setForm] = useState({
    title: "",
    leetcodeNumber: "",
    url: "",
    difficulty: "Medium",
    patterns: [],
    confidence: 3,
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || "",
        leetcodeNumber: initialData.leetcodeNumber || "",
        url: initialData.url || "",
        difficulty: initialData.difficulty || "Medium",
        patterns: initialData.patterns || [],
        confidence: initialData.confidence || 3,
        notes: initialData.notes || "",
      });
      // If editing, figure out which mode makes sense
      setMode(initialData.leetcodeNumber ? "leetcode" : "custom");
    } else {
      setForm({
        title: "",
        leetcodeNumber: "",
        url: "",
        difficulty: "Medium",
        patterns: [],
        confidence: 3,
        notes: "",
      });
      setMode("leetcode");
    }
    setErrors({});
    setAttempted(false);
  }, [initialData, isOpen]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (form.patterns.length === 0) e.patterns = "Select at least one pattern";
    if (
      mode === "custom" &&
      form.url.trim() &&
      !form.url.trim().startsWith("http")
    )
      e.url = "URL must start with http";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    if (attempted) validate();
  }, [form, attempted]);

  const togglePattern = (pattern) => {
    setForm((prev) => ({
      ...prev,
      patterns: prev.patterns.includes(pattern)
        ? prev.patterns.filter((p) => p !== pattern)
        : [...prev.patterns, pattern],
    }));
  };

  const handleLeetCodeSelect = (selected) => {
    setForm((prev) => ({
      ...prev,
      title: selected.title,
      leetcodeNumber: selected.leetcodeNumber,
      url: selected.url,
      difficulty: selected.difficulty,
    }));
    // Clear title error if it was showing
    if (errors.title) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.title;
        return next;
      });
    }
  };

  const handleSave = () => {
    setAttempted(true);
    if (!validate()) return;
    const today = todayStr();
    const confidenceChanged =
      initialData && form.confidence !== initialData.confidence;
    const problem = {
      id: initialData?.id || generateId(),
      title: form.title.trim(),
      leetcodeNumber: form.leetcodeNumber
        ? parseInt(form.leetcodeNumber, 10)
        : null,
      url: form.url.trim() || null,
      difficulty: form.difficulty,
      patterns: form.patterns,
      confidence: form.confidence,
      notes: form.notes.trim(),
      dateAdded: initialData?.dateAdded || today,
      lastReviewed: confidenceChanged
        ? today
        : initialData?.lastReviewed || null,
      nextReviewDate: initialData
        ? addDays(today, getIntervalDays(form.confidence))
        : addDays(today, 1),
    };
    onSave(problem, confidenceChanged);
    onClose();
  };

  if (!isOpen) return null;

  const inputBase =
    "w-full rounded-lg border bg-pb-bg px-3 py-2.5 text-sm text-pb-text outline-none transition-colors duration-150 focus:border-pb-accent";
  const inputNormal = `${inputBase} border-pb-border`;
  const inputError = `${inputBase} border-pb-error`;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[520px] overflow-y-auto rounded-[14px] border border-pb-border bg-pb-surface max-sm:h-screen max-sm:max-h-screen max-sm:max-w-full max-sm:rounded-none sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pb-border px-6 py-4">
          <h2 className="text-base font-semibold text-pb-text">
            {isEdit ? "Edit Problem" : "Add New Problem"}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-xl leading-none text-pb-text-muted hover:text-pb-text"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-[18px] px-6 py-5">
          {/* Mode Toggle — only show when adding new */}
          {!isEdit && (
            <div className="flex gap-1 rounded-lg bg-pb-bg p-1">
              <button
                onClick={() => setMode("leetcode")}
                className={`flex-1 cursor-pointer rounded-md border-none py-1.5 text-[13px] font-semibold transition-all duration-150 ${
                  mode === "leetcode"
                    ? "bg-pb-accent-subtle text-pb-accent"
                    : "bg-transparent text-pb-text-dim hover:text-pb-text-muted"
                }`}
              >
                LeetCode
              </button>
              <button
                onClick={() => setMode("custom")}
                className={`flex-1 cursor-pointer rounded-md border-none py-1.5 text-[13px] font-semibold transition-all duration-150 ${
                  mode === "custom"
                    ? "bg-pb-accent-subtle text-pb-accent"
                    : "bg-transparent text-pb-text-dim hover:text-pb-text-muted"
                }`}
              >
                Custom
              </button>
            </div>
          )}

          {/* LeetCode mode: search field */}
          {mode === "leetcode" && !isEdit && (
            <LeetCodeSearch onSelect={handleLeetCodeSelect} />
          )}

          {/* Show selected problem info or manual fields */}
          {mode === "leetcode" && form.title && (
            <div className="flex items-center gap-3 rounded-lg border border-pb-border bg-pb-bg px-3 py-2.5">
              <span className="text-xs font-semibold text-pb-text-muted">
                #{form.leetcodeNumber}
              </span>
              <span className="flex-1 text-sm font-medium text-pb-text">
                {form.title}
              </span>
              <span
                className={`text-[11px] font-semibold uppercase ${
                  form.difficulty === "Easy"
                    ? "text-pb-easy"
                    : form.difficulty === "Medium"
                      ? "text-pb-medium"
                      : "text-pb-hard"
                }`}
              >
                {form.difficulty}
              </span>
              {!isEdit && (
                <button
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      title: "",
                      leetcodeNumber: "",
                      url: "",
                      difficulty: "Medium",
                    }))
                  }
                  className="cursor-pointer border-none bg-transparent text-xs text-pb-text-dim hover:text-pb-text-muted"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Title required error for LeetCode mode */}
          {mode === "leetcode" && !form.title && attempted && (
            <InlineError message="Select a problem from the search above" />
          )}

          {/* Custom mode: manual title, number, URL fields */}
          {(mode === "custom" || isEdit) && (
            <>
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
                  Problem Title *
                </label>
                <input
                  className={errors.title ? inputError : inputNormal}
                  placeholder="e.g. Two Sum"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <InlineError message={errors.title} />
              </div>

              <div className="grid grid-cols-[1fr_2fr] gap-3">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
                    Problem #
                  </label>
                  <input
                    className={inputNormal}
                    type="number"
                    placeholder="1"
                    value={form.leetcodeNumber}
                    onChange={(e) =>
                      setForm({ ...form, leetcodeNumber: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
                    URL
                  </label>
                  <input
                    className={errors.url ? inputError : inputNormal}
                    placeholder="https://..."
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                  />
                  <InlineError message={errors.url} />
                </div>
              </div>

              {/* Difficulty — only editable in custom mode for non-LC problems */}
              {mode === "custom" && !form.leetcodeNumber && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
                    Difficulty *
                  </label>
                  <div className="flex gap-2">
                    {DIFFICULTIES.map((d) => {
                      const active = form.difficulty === d;
                      const colorMap = {
                        Easy: {
                          border: "border-pb-easy",
                          text: "text-pb-easy",
                          bg: "bg-pb-easy/10",
                        },
                        Medium: {
                          border: "border-pb-medium",
                          text: "text-pb-medium",
                          bg: "bg-pb-medium/10",
                        },
                        Hard: {
                          border: "border-pb-hard",
                          text: "text-pb-hard",
                          bg: "bg-pb-hard/10",
                        },
                      };
                      const c = colorMap[d];
                      return (
                        <button
                          key={d}
                          onClick={() => setForm({ ...form, difficulty: d })}
                          className={`flex-1 cursor-pointer rounded-lg border py-2 text-[13px] font-semibold transition-all duration-150 ${
                            active
                              ? `${c.border} ${c.bg} ${c.text}`
                              : "border-pb-border bg-transparent text-pb-text-muted"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Patterns — always shown */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Patterns * (select at least one)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PATTERNS.map((p) => {
                const active = form.patterns.includes(p);
                const pc = PATTERN_COLORS[p];
                return (
                  <button
                    key={p}
                    onClick={() => togglePattern(p)}
                    className="cursor-pointer rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-all duration-150"
                    style={{
                      borderColor: active
                        ? pc.text
                        : errors.patterns
                          ? "rgba(248,81,73,0.37)"
                          : "#30363d",
                      backgroundColor: active ? pc.bg : "transparent",
                      color: active ? pc.text : "#8b949e",
                    }}
                  >
                    {active ? "✓ " : ""}
                    {p}
                  </button>
                );
              })}
            </div>
            <InlineError message={errors.patterns} />
          </div>

          {/* Confidence — always shown */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Confidence
            </label>
            <StarRating
              value={form.confidence}
              onChange={(v) => setForm({ ...form, confidence: v })}
              size={24}
            />
          </div>

          {/* Notes — always shown */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Notes
            </label>
            <textarea
              className={`${inputNormal} min-h-[80px] resize-y font-[inherit] leading-relaxed`}
              placeholder="Key insight, approach, time/space complexity..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 border-t border-pb-border px-6 py-4">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-pb-border bg-transparent px-5 py-2 text-[13px] font-semibold text-pb-text-muted hover:border-pb-text-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="cursor-pointer rounded-lg border-none bg-pb-accent px-5 py-2 text-[13px] font-semibold text-white hover:opacity-85"
          >
            {isEdit ? "Save Changes" : "Save Problem"}
          </button>
        </div>
      </div>
    </div>
  );
}
