import type { Recipe } from "../types";
import { MODE_ACCENT, MODE_LABEL } from "../lib/mode";

interface Props {
  recipe: Recipe;
  onBack: () => void;
}

function formatQty(qty: string | null, unit: string | null): string {
  if (qty === null && unit === null) return "";
  if (qty === null) return unit!;
  if (unit === null) return qty;
  return `${qty} ${unit}`;
}

export function RecipeDetail({ recipe, onBack }: Props) {
  const accent = MODE_ACCENT[recipe.mode];

  const sourceDomain = (() => {
    try {
      return recipe.source_url ? new URL(recipe.source_url).hostname.replace(/^www\./, "") : null;
    } catch {
      return null;
    }
  })();

  return (
    <article>
      {/* Back */}
      <button
        type="button"
        className="btn-quiet mb-8 -ml-2"
        onClick={onBack}
      >
        Back
      </button>

      {/* Header */}
      <header className={`border-l-3 ${accent.border} pl-4 mb-10`}>
        <p className={`${accent.text} text-sm font-medium mb-1`}>
          {MODE_LABEL[recipe.mode]}
        </p>
        <h2 className="font-serif text-3xl leading-snug">{recipe.title}</h2>

        {/* Meta row */}
        {(() => {
          const meta = [
            recipe.cuisine,
            recipe.protein,
            recipe.method,
            recipe.total_min !== null
              ? `${recipe.total_min} min`
              : recipe.active_min !== null
              ? `${recipe.active_min} min active`
              : null,
            recipe.pan_size,
          ].filter((v): v is string => v !== null && v.length > 0);
          return meta.length > 0 ? (
            <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
              {meta.map((v) => (
                <span key={v}>{v}</span>
              ))}
            </p>
          ) : null;
        })()}
      </header>

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <section className="mb-10">
          <h3 className="font-sans text-sm font-medium text-ink-soft uppercase tracking-wide mb-4">
            Ingredients
          </h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => {
              const qty = formatQty(ing.qty, ing.unit);
              return (
                <li key={i} className="font-serif text-lg flex gap-4">
                  {qty && (
                    <span
                      className={`shrink-0 w-24 text-right text-ink-soft${ing.inferred ? " inferred" : ""}`}
                    >
                      {qty}
                    </span>
                  )}
                  <span className={ing.inferred ? "inferred" : ""}>{ing.item}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <section className="mb-10">
          <h3 className="font-sans text-sm font-medium text-ink-soft uppercase tracking-wide mb-4">
            Steps
          </h3>
          <ol className="space-y-6">
            {recipe.steps.map((step, i) => {
              const stepMeta = [
                step.temp_f !== null ? `${step.temp_f}°F` : null,
                step.time_min !== null ? `${step.time_min} min` : null,
              ].filter((v): v is string => v !== null);

              return (
                <li key={i} className="flex gap-5">
                  <span className="shrink-0 font-sans text-sm font-medium text-ink-soft w-6 pt-1 text-right">
                    {i + 1}
                  </span>
                  <div>
                    <p className={`font-serif text-lg leading-relaxed${step.inferred ? " inferred" : ""}`}>
                      {step.text}
                    </p>
                    {stepMeta.length > 0 && (
                      <p className="mt-1 flex gap-4 text-sm text-ink-soft">
                        {stepMeta.map((v) => (
                          <span key={v}>{v}</span>
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Source link */}
      {recipe.source_url !== null && sourceDomain !== null && (
        <footer className="border-t border-ink/10 pt-6 text-sm text-ink-soft">
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 decoration-ink-soft/40"
          >
            View original on {sourceDomain}
          </a>
        </footer>
      )}
    </article>
  );
}
