import type { PromptMode } from "./storyboard";

export interface Project {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  createdAt: number;
  updatedAt: number;
  characterIds: string[];
  sceneBookId?: string;
  presetId?: string;
  renderPresetId?: string;
  workflowTemplateId?: string;
  storyboardIds: string[];
  settings: {
    outputFormat: "image_sequence";
    aspectRatio: string;
    targetDuration?: number;
    /** Prompt 编译模式：rules = 纯资产编译，llm-assisted = LLM 视觉草案 + 程序收口 */
    promptMode?: PromptMode;
  };
}
