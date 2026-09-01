import { useState } from "react";
import type {
  Ingredient,
  Mode,
  NewRecipeInput,
  SourceType,
  Step,
} from "../types";
import { MODE_ACCENT, MODE_LABEL } from "../lib/mode";

interface Props {
  onSaved: () => void;
  onCancel: () => void;
  save: (input: NewRecipeInput) => Promise<unknown>;
}

type DraftIngredient = { qty: string; unit: string; item: string };
type DraftStep = { text: string; temp_f: string; time_min: string };

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "tiktok", label: "TikTok" },
  { value: "pinterest", label: "Pinterest" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "cookbook", label: "Cookbook" },
  { value: "other", label: "Somewhere else" },
];

const emptyIngredient = (): DraftIngredient => ({ qty: "", unit: "", item: "" });
const emptyStep = (): DraftStep => ({ text: "", temp_f: "", time_min: "" });

export function RecipeForm({ onSaved, onCancel, save }: Props) {
  const [mode, setMode] = useState<Mode>("cook");
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<SourceType | "">("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [creatorHandle, setCreatorHandle] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [protein, setProtein] = useState("");
  const [method, setMethod] = useState("");
  const [panSize, setPanSize] = useState("");
  const [activeMin, setActiveMin] = useState("");
  const [totalMin, setTotalMin] = useState("");
  const [note, setNote] = useState("");

  const [ingredients, setIngredients] = useState<DraftIngredient[]>([
    emptyIngredient(),
    emptyIngredient(),
    emptyIngredient(),
  ]);
  const [steps, setSteps] = useState<DraftStep[]>([emptyStep(), emptyStep()]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accent = MODE_ACCENT[mode];

  function updateIngredient(
    index: number,
    field: keyof DraftIngredient,
    value: string,
  ) {
    setIngredients((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function updateStep(index: number, field: keyof DraftStep, value: string) {
    setSteps((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (title.trim().length === 0) {
      setError("Give it a title so you can find it again.");
      return;
    }

    const cleanIngredients: Ingredient[] = ingredients
      .filter((row) => row.item.trim().length > 0)
      .map((row) => ({
        item: row.item.trim(),
        qty: row.qty.trim() || null,
        unit: row.unit.trim() || null,
        // Typed by hand, so nothing here is inferred.
        inferred: false,
      }));

    const cleanSteps: Step[] = steps
      .filter((row) => row.text.trim().length > 0)
      .map((row) => ({
        text: row.text.trim(),
        temp_f: row.temp_f.trim() ? Number(row.temp_f) : null,
        time_min: row.time_min.trim() ? Number(row.time_min) : null,
        inferred: false,
      }));

    setSaving(true);
    try {
      await save({
        mode,
        title: title.trim(),
        source_type: sourceType || null,
        source_url: sourceUrl.trim() || null,
        creator_handle: creatorHandle.trim() || null,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        pan_size: panSize.trim() || null,
        active_min: activeMin.trim() ? Number(activeMin) : null,
        total_min: totalMin.trim() ? Number(totalMin) : null,
        cuisine: cuisine.trim() || null,
        protein: protein.trim() || null,
        method: method.trim() || null,
        capture_note: note.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="animate-tap-in">
      <div className={`border-l-3 ${accent.border} pl-5 space-y-8`}>
        {/* Mode. Chosen first because it changes what the rest of the form asks. */}
        <div>
          <span className="field-label">This is</span>
          <div className="flex gap-2">
            {(["cook", "bake"] as Mode[]).map((option) => {
              const active = option === mode;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  aria-pressed={active}
                  className={[
                    "px-4 py-2 font-medium transition-colors duration-tap",
                    active
                      ? `${MODE_ACCENT[option].bg} text-night-text`
                      : "bg-ground-deep text-ink-soft active:bg-ink/10",
                  ].join(" ")}
                >
                  {MODE_LABEL[option]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="field font-serif text-xl"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Miso salmon"
            autoFocus
          />
        </div>

        {/* Ingredients */}
        <div>
          <span className="field-label">Ingredients</span>
          <div className="space-y-2">
            {ingredients.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="field w-20 font-serif"
                  value={row.qty}
                  onChange={(e) => updateIngredient(index, "qty", e.target.value)}
                  placeholder={index === 0 ? "2" : ""}
                  aria-label={`Ingredient ${index + 1} quantity`}
                />
                <input
                  className="field w-24 font-serif"
                  value={row.unit}
                  onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                  placeholder={index === 0 ? "tbsp" : ""}
                  aria-label={`Ingredient ${index + 1} unit`}
                />
                <input
                  className="field flex-1 font-serif"
                  value={row.item}
                  onChange={(e) => updateIngredient(index, "item", e.target.value)}
                  placeholder={index === 0 ? "white miso" : ""}
                  aria-label={`Ingredient ${index + 1}`}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn-quiet mt-3 text-sm"
            onClick={() => setIngredients((prev) => [...prev, emptyIngredient()])}
          >
            Add ingredient
          </button>
        </div>

        {/* Steps — numbered, because a recipe genuinely is a sequence. */}
        <div>
          <span className="field-label">Steps</span>
          <div className="space-y-4">
            {steps.map((row, index) => (
              <div key={index} className="flex gap-3">
                <span
                  className={`${accent.text} font-sans font-semibold pt-2 w-6 shrink-0 tabular-nums`}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <textarea
                    className="field font-serif leading-recipe resize-y"
                    rows={2}
                    value={row.text}
                    onChange={(e) => updateStep(index, "text", e.target.value)}
                    placeholder={
                      index === 0 ? "Whisk the miso with the mirin until smooth." : ""
                    }
                    aria-label={`Step ${index + 1}`}
                  />
                  <div className="flex gap-2">
                    <input
                      className="field w-32"
                      value={row.temp_f}
                      onChange={(e) => updateStep(index, "temp_f", e.target.value)}
                      placeholder={index === 0 ? "400°F" : ""}
                      inputMode="numeric"
                      aria-label={`Step ${index + 1} temperature in Fahrenheit`}
                    />
                    <input
                      className="field w-32"
                      value={row.time_min}
                      onChange={(e) =>
                        updateStep(index, "time_min", e.target.value)
                      }
                      placeholder={index === 0 ? "12 min" : ""}
                      inputMode="numeric"
                      aria-label={`Step ${index + 1} time in minutes`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn-quiet mt-3 text-sm"
            onClick={() => setSteps((prev) => [...prev, emptyStep()])}
          >
            Add step
          </button>
        </div>

        {/* Timing and pan. Pan size sits with timing for baking, where it
            decides the outcome (spec §3c). */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="active-min">
              Active minutes
            </label>
            <input
              id="active-min"
              className="field"
              value={activeMin}
              onChange={(e) => setActiveMin(e.target.value)}
              inputMode="numeric"
              placeholder="20"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="total-min">
              Total minutes
            </label>
            <input
              id="total-min"
              className="field"
              value={totalMin}
              onChange={(e) => setTotalMin(e.target.value)}
              inputMode="numeric"
              placeholder="45"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="pan-size">
              Pan size
            </label>
            <input
              id="pan-size"
              className="field"
              value={panSize}
              onChange={(e) => setPanSize(e.target.value)}
              placeholder={mode === "bake" ? "9-inch round" : "12-inch skillet"}
            />
          </div>
        </div>

        {/* Where it came from */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="source-type">
              Came from
            </label>
            <select
              id="source-type"
              className="field"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType | "")}
            >
              <option value="">Not saying</option>
              {SOURCE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="creator">
              Creator
            </label>
            <input
              id="creator"
              className="field"
              value={creatorHandle}
              onChange={(e) => setCreatorHandle(e.target.value)}
              placeholder="@handle"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="field-label" htmlFor="source-url">
              Link
            </label>
            <input
              id="source-url"
              className="field"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://"
              inputMode="url"
            />
          </div>
        </div>

        {/* Tags-as-columns */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="field-label" htmlFor="cuisine">
              Cuisine
            </label>
            <input
              id="cuisine"
              className="field"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              placeholder="Japanese"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="protein">
              Protein
            </label>
            <input
              id="protein"
              className="field"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="Salmon"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="method">
              Method
            </label>
            <input
              id="method"
              className="field"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="Roast"
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="note">
            Note to yourself
          </label>
          <textarea
            id="note"
            className="field font-serif leading-recipe resize-y"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="She used gochujang, not sriracha."
          />
        </div>

        {error !== null && (
          <p role="alert" className="text-bake font-medium">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pb-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving" : "Save recipe"}
          </button>
          <button type="button" className="btn-quiet" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
