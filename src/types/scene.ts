export interface SceneBook {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  constants: SceneEntry[];
  entries: SceneEntry[];
  extensions?: Record<string, unknown>;
}

/** Controls which pipeline(s) a scene entry feeds into. */
export type SceneEntryUsage = "director_only" | "image_only" | "shared";

export interface SceneEntry {
  id: string;
  name: string;
  enabled: boolean;

  /**
   * Which pipeline(s) this entry is injected into:
   * - `director_only` — only sent to the Director LLM (plot context, rules, world-building)
   * - `image_only`    — only sent to the image prompt compiler (CLIP-friendly visual keywords)
   * - `shared`        — injected into both (default for backward compatibility)
   */
  usage: SceneEntryUsage;

  keywords: string[];
  secondaryKeywords?: string[];
  useRegex?: boolean;
  alwaysActive?: boolean;
  content: {
    /** Director-only narrative context (plot hooks, relationship notes, world rules).
     *  Never sent to CLIP / image prompt. */
    directorContext?: string;

    /** CLIP-friendly environment prompt (visual keywords in English). */
    environmentPrompt: string;
    negativePrompt?: string;
    props?: string[];
    atmosphere?: string;
    lighting?: string;
    timeOfDay?: string;
    weather?: string;
    sound?: string;
    colorPalette?: string[];
  };
  referenceImages?: string[];
  insertionOrder: number;
  tokenBudget?: number;
}
