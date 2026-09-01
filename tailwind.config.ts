import type { Config } from "tailwindcss";

/**
 * mise — token system.
 *
 * Warmth comes from an oat/clay ground and a brown-black ink, not from cream
 * and orange. The two mode accents are the one place with real color and they
 * carry information: cook is deep olive, bake is deep plum.
 *
 * Explicitly avoided, per the kickoff doc: cream backgrounds near #F4F1EA,
 * terracotta accents near #D97757, high-contrast display serifs.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Replaces Tailwind's default palette outright, so a stray `bg-orange-500`
    // is a build error rather than a slow drift back to the generic look.
    colors: {
      transparent: "transparent",
      current: "currentColor",

      ground: "#E4DDCC",       // warm oat, the browsing background
      "ground-deep": "#D6CDB8", // raised surfaces, chips, inactive states
      ink: "#241F1A",          // warm near-black, all body text
      "ink-soft": "#6B6157",   // secondary text, metadata
      cook: "#46583A",         // deep olive — cook mode accent
      bake: "#7A3B52",         // deep plum — bake mode accent
      night: "#16130F",        // Cook Mode ground
      "night-text": "#F2ECDF", // Cook Mode text
    },

    // Two families split by role: chrome versus content.
    fontFamily: {
      // Navigation, buttons, labels, scores, metadata.
      sans: ['"Instrument Sans"', "system-ui", "-apple-system", "sans-serif"],
      // Titles, ingredients, steps. Low contrast on purpose.
      serif: ["Newsreader", "Georgia", "serif"],
    },

    extend: {
      // Recipe content stays under 70 characters.
      maxWidth: {
        measure: "62ch",
      },
      lineHeight: {
        // Generous, for ingredients and steps.
        recipe: "1.7",
      },
      // Hierarchy comes from weight and space, not borders on everything.
      borderWidth: {
        3: "3px",
      },
      // Motion only in response to a tap.
      transitionDuration: {
        tap: "120ms",
      },
      keyframes: {
        "tap-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "tap-in": "tap-in 120ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
