import type { Recipe } from "../types";
import { MODE_ACCENT, MODE_LABEL } from "../lib/mode";

interface Props {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  /** Empty because nothing is saved at all, vs. empty because of the filter. */
  filtered: boolean;
  onAdd: () => void;
  onSelect: (recipe: Recipe) => void;
}

function timing(recipe: Recipe): string | null {
  if (recipe.total_min !== null) return `${recipe.total_min} min`;
  if (recipe.active_min !== null) return `${recipe.active_min} min active`;
  return null;
}

function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  const accent = MODE_ACCENT[recipe.mode];

  // Metadata is laid out with space, not joined with middle dots.
  const meta = [
    recipe.cuisine,
    recipe.protein,
    recipe.method,
    timing(recipe),
  ].filter((value): value is string => value !== null && value.length > 0);

  const counts: string[] = [];
  if (recipe.ingredients.length > 0) {
    counts.push(
      `${recipe.ingredients.length} ingredient${recipe.ingredients.length === 1 ? "" : "s"}`,
    );
  }
  if (recipe.steps.length > 0) {
    counts.push(
      `${recipe.steps.length} step${recipe.steps.length === 1 ? "" : "s"}`,
    );
  }

  return (
    <article
      className={`border-l-3 ${accent.border} bg-ground-deep px-5 py-4 cursor-pointer active:opacity-80`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {/* Mode label always travels with the accent — never color alone. */}
      <p className={`${accent.text} text-sm font-medium mb-1`}>
        {MODE_LABEL[recipe.mode]}
      </p>

      <h3 className="font-serif text-2xl leading-snug max-w-measure">
        {recipe.title}
      </h3>

      {meta.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
          {meta.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </p>
      )}

      {counts.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-x-5 text-sm text-ink-soft">
          {counts.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </p>
      )}

      {recipe.creator_handle !== null && (
        <p className="mt-3 text-sm text-ink-soft">
          {recipe.source_url !== null ? (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 decoration-ink-soft/40"
            >
              {recipe.creator_handle}
            </a>
          ) : (
            recipe.creator_handle
          )}
        </p>
      )}
    </article>
  );
}

export function RecipeList({ recipes, loading, error, filtered, onAdd, onSelect }: Props) {
  if (loading) {
    return <p className="text-ink-soft">Loading your recipes.</p>;
  }

  if (error !== null) {
    return (
      <p role="alert" className="text-bake font-medium">
        {error}
      </p>
    );
  }

  if (recipes.length === 0) {
    // Empty states say what to do next.
    return filtered ? (
      <p className="text-ink-soft max-w-measure">
        Nothing saved in this mode yet. Switch the filter to Everything, or add
        one.
      </p>
    ) : (
      <div className="max-w-measure">
        <p className="text-ink-soft">
          Nothing saved yet. Type in a recipe you already cook and it will show
          up here.
        </p>
        <button type="button" className="btn-primary mt-4" onClick={onAdd}>
          Add a recipe
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} onClick={() => onSelect(recipe)} />
      ))}
    </div>
  );
}
