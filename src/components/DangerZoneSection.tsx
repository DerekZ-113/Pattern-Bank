import { buttonClass } from "../utils/buttonStyles";

interface Props {
  onSetAllDue: () => void;
  onRequestClearData: () => void;
  hideLabel?: boolean;
}

export default function DangerZoneSection({ onSetAllDue, onRequestClearData, hideLabel }: Props) {
  return (
    <div>
      {!hideLabel && (
        <label className="mb-2 block text-[13px] font-semibold text-pb-text-muted">
          Danger zone
        </label>
      )}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onSetAllDue}
          className={`${buttonClass("danger")} w-full`}
        >
          Set all problems due today
        </button>
        <button
          type="button"
          onClick={onRequestClearData}
          className={`${buttonClass("danger")} w-full`}
        >
          Clear all data
        </button>
      </div>
    </div>
  );
}
