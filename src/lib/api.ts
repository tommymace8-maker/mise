import type { Mode, NewRecipeInput, Recipe } from "../types";

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // fall through with the status message
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function listRecipes(mode: Mode | "all"): Promise<Recipe[]> {
  const query = mode === "all" ? "" : `?mode=${mode}`;
  const data = await unwrap<{ recipes: Recipe[] }>(
    await fetch(`/api/recipes${query}`),
  );
  return data.recipes;
}

export async function createRecipe(input: NewRecipeInput): Promise<Recipe> {
  const data = await unwrap<{ recipe: Recipe }>(
    await fetch("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return data.recipe;
}
