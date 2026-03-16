export interface DirectorPreset {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  llm: {
    adapter: string;
    model: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
  };
  systemPrompt: string;
  storyboardSchema: string;
  visualStyle: {
    defaultImageAdapter: string;
    steps: number;
    cfgScale: number;
    sampler: string;
    checkpoint: string;
    width: number;
    height: number;
    clipSkip?: number;
  };
  promptTemplates: {
    characterTemplate: string;
    sceneTemplate: string;
    finalTemplate: string;
  };
}
