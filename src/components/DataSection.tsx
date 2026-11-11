import { useRef } from "react";
import posthog from "posthog-js";
import Icon from "./Icon";
import { buttonClass } from "../utils/buttonStyles";

interface Props {
  problemCount: number;
  onExport: () => void;
  onImport: (file: File) => void;
  onClose: () => void;
  hideLabel?: boolean;
}

export default function DataSection({ problemCount, onExport, onImport, onClose, hideLabel }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = "";
    }
  };

  return (
    <div>
      {!hideLabel && (
        <label className="mb-2 block text-[13px] font-semibold text-pb-text-muted">
          Data
        </label>
      )}
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
            type="button"
            onClick={() => { posthog.capture("data_exported", { problem_count: problemCount, platform: "web" }); onExport(); onClose(); }}
            className={`${buttonClass("outline")} w-full`}
          >
            <Icon name="download" />
            Export Backup
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`${buttonClass("outline")} w-full`}
        >
          <Icon name="upload" />
          Import Backup
        </button>
      </div>
    </div>
  );
}
