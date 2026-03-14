import { useState } from "react";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}

export default function StarRating({ value, onChange, size = 20 }: Props) {
  const [hover, setHover] = useState(0);
  const interactive = !!onChange;

  return (
    <div className="flex items-center gap-0.5" role={interactive ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          role={interactive ? "radio" : undefined}
          aria-checked={interactive ? star === value : undefined}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          tabIndex={interactive ? 0 : undefined}
          onClick={() => interactive && onChange(star)}
          onKeyDown={(e) => interactive && e.key === "Enter" && onChange(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className="select-none leading-none transition-colors duration-150"
          style={{
            cursor: interactive ? "pointer" : "default",
            fontSize: size,
            color: star <= (hover || value) ? "#e3b341" : "#30363d",
          }}
        >
          ★
        </span>
      ))}
      {interactive && (
        <span className="ml-1.5 text-xs text-pb-text-muted">
          {hover || value || 0}/5
        </span>
      )}
    </div>
  );
}
