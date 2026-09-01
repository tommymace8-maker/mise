import type { Mode } from "../types";
import { MODE_ACCENT, MODE_LABEL } from "../lib/mode";

export type ModeFilterValue = Mode | "all";

interface Props {
  value: ModeFilterValue;
  onChange: (value: ModeFilterValue) => void;
  counts: Record<ModeFilterValue, number>;
}

const OPTIONS: { value: ModeFilterValue; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "cook", label: MODE_LABEL.cook },
  { value: "bake", label: MODE_LABEL.bake },
];

export function ModeFilter({ value, onChange, counts }: Props) {
  return (
    <div className="flex gap-2" role="group" aria-label="Filter by mode">
      {OPTIONS.map((option) => {
        const active = option.value === value;
        const accent =
          option.value === "all" ? null : MODE_ACCENT[option.value as Mode];

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={[
              "px-3 py-1.5 text-sm font-medium transition-colors duration-tap",
              active
                ? accent
                  ? `${accent.bg} text-night-text`
                  : "bg-ink text-ground"
                : "bg-ground-deep text-ink-soft active:bg-ink/10",
            ].join(" ")}
          >
            {option.label}
            <span className={active ? "opacity-70" : "opacity-60"}>
              {" "}
              {counts[option.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
