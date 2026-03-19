/**
 * RenderPreset — "how to render images", separated from DirectorPreset ("how to direct the story").
 *
 * Contains quality word packs, negative prompts, default generation parameters,
 * and optional hires/adetailer settings. One RenderPreset can be shared across
 * multiple projects and director presets.
 */
export interface RenderPreset {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;

  /** Quality tokens prepended to every positive prompt. */
  positivePrefix: string[];
  /** Quality tokens appended to every positive prompt. */
  positiveSuffix: string[];
  /** Default negative prompt tokens. */
  negativePrompt: string[];

  /** Default generation parameters. */
  defaults: {
    checkpoint: string;
    sampler: string;
    scheduler?: string;
    steps: number;
    cfgScale: number;
    clipSkip?: number;
    width: number;
    height: number;
  };

  /** Hi-res fix settings. */
  hires?: {
    enabled: boolean;
    steps?: number;
    upscale?: number;
    denoise?: number;
    upscaler?: string;
    cfgScale?: number;
  };

  /** ADetailer face/hand fix. */
  adetailer?: {
    enabled: boolean;
  };

  /**
   * Custom system prompt for the LLM Prompt Writer (llm-writer mode).
   * Controls how the LLM converts structured assets into a focused SD prompt.
   * When empty/undefined, falls back to the built-in default.
   * Different art styles (chibi, anime, realistic) need different writing strategies.
   */
  promptWriterPrompt?: string;
}
