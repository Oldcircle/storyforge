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

export interface SceneEntry {
  id: string;
  name: string;
  enabled: boolean;
  keywords: string[];
  secondaryKeywords?: string[];
  useRegex?: boolean;
  alwaysActive?: boolean;
  content: {
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
