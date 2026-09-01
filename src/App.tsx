import { useCallback, useEffect, useMemo, useState } from "react";
import { ModeFilter, type ModeFilterValue } from "./components/ModeFilter";
import { RecipeForm } from "./components/RecipeForm";
import { RecipeList } from "./components/RecipeList";
import { createRecipe, listRecipes } from "./lib/api";
import type { Recipe } from "./types";

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ModeFilterValue>("all");
  const [adding, setAdding] = useState(false);

  // The list is small enough at this stage to hold whole and filter in memory.
  // The API takes ?mode= as well; that is what later sessions will use once
  // the archive is 300 items deep.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecipes(await listRecipes("all"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach the recipe list.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: recipes.length,
      cook: recipes.filter((r) => r.mode === "cook").length,
      bake: recipes.filter((r) => r.mode === "bake").length,
    }),
    [recipes],
  );

  const visible = useMemo(
    () =>
      filter === "all" ? recipes : recipes.filter((r) => r.mode === filter),
    [recipes, filter],
  );

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-10">
          <h1 className="font-serif text-4xl">Mise</h1>
          <p className="mt-1 text-ink-soft">Everything worth cooking twice.</p>
        </header>

        {adding ? (
          <section aria-label="Add a recipe">
            <h2 className="font-serif text-2xl mb-6">Add a recipe</h2>
            <RecipeForm
              save={createRecipe}
              onCancel={() => setAdding(false)}
              onSaved={() => {
                setAdding(false);
                void load();
              }}
            />
          </section>
        ) : (
          <section aria-label="Saved recipes">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <ModeFilter value={filter} onChange={setFilter} counts={counts} />
              <button
                type="button"
                className="btn-primary"
                onClick={() => setAdding(true)}
              >
                Add a recipe
              </button>
            </div>

            <RecipeList
              recipes={visible}
              loading={loading}
              error={error}
              filtered={filter !== "all" && recipes.length > 0}
              onAdd={() => setAdding(true)}
            />
          </section>
        )}
      </div>
    </div>
  );
}
