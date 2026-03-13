import { useRef } from "react";
import posthog from "posthog-js";

export default function DataSection({ problemCount, onExport, onImport, onClose }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = "";
    }
  };

  return (
    <div>
      <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
        Data
      </label>
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        {problemCount > 0 && (
          <button
            onClick={() => { posthog.capture("data_exported", { problem_count: problemCount, platform: "web" }); onExport(); onClose(); }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-pb-border bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
          >
            <span className="text-sm">↓</span>
            Export Backup
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-pb-border bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
        >
          <span className="text-sm">↑</span>
          Import Backup
        </button>
      </div>
    </div>
  );
}
