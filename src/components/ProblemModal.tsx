import { useState, useEffect, useCallback } from "react";
import { DIFFICULTIES } from "../utils/constants";
import { todayStr, addDays, generateId } from "../utils/dateHelpers";
import { getIntervalDays } from "../utils/spacedRepetition";
import StarRating from "./StarRating";
import InlineError from "./InlineError";
import LeetCodeSearch from "./LeetCodeSearch";
import ReviewHistory from "./ReviewHistory";
import ModeToggle from "./ModeToggle";
import ProblemInfo from "./ProblemInfo";
import PatternSelector from "./PatternSelector";
import NotesEditor from "./NotesEditor";
import ConfidenceInfo from "./ConfidenceInfo";
import type { Problem, Difficulty, Confidence } from "../types";

interface ProblemFormState {
  title: string;
  leetcodeNumber: string | number;
  url: string;
  difficulty: Difficulty;
  patterns: string[];
  confidence: Confidence;
  notes: string;
  excludeFromReview: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (problem: Problem, confidenceChanged: boolean) => void;
  initialData: Problem | null;
  existingProblemNumbers?: Set<number>;
}

const EMPTY_FORM: ProblemFormState = {
  title: "",
  leetcodeNumber: "",
  url: "",
  difficulty: "Medium",
  patterns: [],
  confidence: 3,
  notes: "",
  excludeFromReview: false,
};

export default function ProblemModal({ isOpen, onClose, onSave, initialData, existingProblemNumbers = new Set() }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const isEdit = !!initialData;
  const [mode, setMode] = useState("leetcode");
  const [form, setForm] = useState<ProblemFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
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
        excludeFromReview: initialData.excludeFromReview || false,
      });
      setMode(initialData.leetcodeNumber ? "leetcode" : "custom");
    } else {
      setForm(EMPTY_FORM);
      setMode("leetcode");
    }
    setErrors({});
    setAttempted(false);
  }, [initialData, isOpen]);

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
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
  }, [form, mode]);

  useEffect(() => {
    if (attempted) validate();
  }, [form, attempted, validate]);

  const updateForm = (updates: Partial<ProblemFormState>) => setForm((prev) => ({ ...prev, ...updates }));

  const handleLeetCodeSelect = (selected: { title: string; leetcodeNumber: number; difficulty: Difficulty; url: string }) => {
    updateForm({
      title: selected.title,
      leetcodeNumber: selected.leetcodeNumber,
      url: selected.url,
      difficulty: selected.difficulty,
    });
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
    const problem: Problem = {
      id: initialData?.id || generateId(),
      title: form.title.trim(),
      leetcodeNumber: form.leetcodeNumber
        ? parseInt(form.leetcodeNumber as string, 10)
        : null,
      url: form.url.trim() || null,
      difficulty: form.difficulty,
      patterns: form.patterns,
      confidence: form.confidence,
      notes: form.notes.trim(),
      excludeFromReview: form.excludeFromReview,
      dateAdded: initialData?.dateAdded || today,
      lastReviewed: confidenceChanged
        ? today
        : initialData?.lastReviewed || null,
      nextReviewDate: initialData
        ? addDays(today, getIntervalDays(form.confidence))
        : addDays(today, 1),
      updatedAt: new Date().toISOString(),
    };
    onSave(problem, !!confidenceChanged);
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
            {isEdit ? "Problem Details" : "Add New Problem"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-xl leading-none text-pb-text-muted hover:text-pb-text"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-[18px] px-6 py-5">
          {!isEdit && <ModeToggle mode={mode} onModeChange={setMode} />}

          {mode === "leetcode" && !isEdit && (
            <LeetCodeSearch onSelect={handleLeetCodeSelect} />
          )}

          {mode === "leetcode" && form.title && (
            <ProblemInfo
              form={form}
              isEdit={isEdit}
              onClear={() =>
                updateForm({
                  title: "",
                  leetcodeNumber: "",
                  url: "",
                  difficulty: "Medium",
                })
              }
            />
          )}

          {!isEdit && form.leetcodeNumber && existingProblemNumbers.has(Number(form.leetcodeNumber)) && (
            <div className="flex items-center gap-2 rounded-lg border border-pb-star/30 bg-pb-star/10 px-4 py-2.5 text-[13px] text-pb-star">
              <span>⚠</span>
              <span>This problem is already in your library.</span>
            </div>
          )}

          {mode === "leetcode" && !form.title && attempted && (
            <InlineError message="Select a problem from the search above" />
          )}

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
                  onChange={(e) => updateForm({ title: e.target.value })}
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
                      updateForm({ leetcodeNumber: e.target.value })
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
                    onChange={(e) => updateForm({ url: e.target.value })}
                  />
                  <InlineError message={errors.url} />
                </div>
              </div>

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
                          onClick={() => updateForm({ difficulty: d })}
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

          <PatternSelector
            selected={form.patterns}
            onChange={(patterns) => updateForm({ patterns })}
            error={errors.patterns}
          />

          <div>
            <label className="mb-1.5 flex items-center text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
              Confidence
              <span className="ml-[15px]"><ConfidenceInfo /></span>
            </label>
            <StarRating
              value={form.confidence}
              onChange={(v) => updateForm({ confidence: v as Confidence })}
              size={24}
            />
          </div>

          <NotesEditor
            value={form.notes}
            onChange={(notes) => updateForm({ notes })}
            inputClassName={inputNormal}
          />

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-pb-border bg-pb-bg px-4 py-3">
              <div>
                <div className="text-[13px] font-semibold text-pb-text-muted">
                  Exclude from Review
                </div>
                <div className="text-[12px] text-pb-text-dim">
                  Keep in library but skip daily reviews
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateForm({ excludeFromReview: !form.excludeFromReview })}
                className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-200 ${
                  form.excludeFromReview ? "bg-pb-accent" : "bg-pb-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
                    form.excludeFromReview ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          )}

          {isEdit && (
            <ReviewHistory problemId={initialData?.id} isOpen={isOpen} />
          )}
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
