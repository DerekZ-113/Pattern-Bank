import { useRef } from "react";

export default function Header({ onAddClick, onExport, onImport, problemCount }) {
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      // Reset so the same file can be selected again
      e.target.value = "";
    }
  };

  return (
    <div className="sticky top-0 z-[800] flex items-center justify-between border-b border-pb-border bg-pb-surface px-5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="text-base font-bold leading-none text-pb-accent">⟡</span>
        <h1 className="text-lg font-bold tracking-tight text-pb-text">
          PatternBank
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        {problemCount > 0 && (
          <button
            onClick={onExport}
            title="Export data as JSON backup"
            className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-sm text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
          >
            ↓
          </button>
        )}
        <button
          onClick={handleImportClick}
          title="Import data from JSON backup"
          className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-sm text-pb-text-muted transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text"
        >
          ↑
        </button>
        <button
          onClick={onAddClick}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-pb-accent bg-pb-accent-subtle px-3.5 py-[7px] text-[13px] font-semibold text-pb-accent transition-all duration-150 hover:bg-pb-accent hover:text-white"
        >
          + Add Problem
        </button>
      </div>
    </div>
  );
}
