import { useRef, useEffect } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
}

export default function NotesEditor({ value, onChange, inputClassName }: Props) {
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
        Notes
      </label>
      <textarea
        ref={notesRef}
        className={`${inputClassName} min-h-[80px] resize-none overflow-hidden font-[inherit] leading-relaxed`}
        placeholder="Key insight, approach, time/space complexity..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
