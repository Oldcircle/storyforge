import type { ShotCharacter } from "./character";

export interface Storyboard {
  id: string;
  projectId: string;
  sceneNumber: number;
  sceneTitle: string;
  createdAt: number;
  updatedAt: number;
  userPrompt: string;
  shots: Shot[];
  status: "draft" | "generating" | "completed" | "error";
}

/**
 * LLM 视觉意图草案 — 由导演 LLM 在 LLM 增强模式下可选输出。
 *
 * 只包含视觉语义，不包含硬件参数（checkpoint/sampler/steps 等由 RenderPreset 管控）。
 * 所有字段可选，LLM 可以只输出它有把握的部分。
 * 用户也可以手动填写/编辑，不强制依赖 LLM。
 */
export interface VisualIntent {
  /** 画面主体描述（英文） */
  subject?: string;
  /** 构图建议（如 "rule of thirds, slightly off-center"） */
  composition?: string;
  /** 氛围/色调（如 "warm interior contrasting cold rain"） */
  atmosphere?: string;
  /** LLM 推荐的正向 prompt 关键词 */
  suggestedPositive?: string;
  /** LLM 推荐的负向 prompt 关键词 */
  suggestedNegative?: string;
}

export interface ShotExecutionRequest {
  positive: string;
  negative: string;
  width: number;
  height: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  checkpoint?: string;
  seed?: number;
  clipSkip?: number;
  workflowTemplateId?: string;
  workflowTemplateVersion?: string;
}

export interface ShotExecutionSnapshot {
  adapterId: string;
  status: "pending" | "running" | "completed" | "error";
  startedAt?: number;
  finishedAt?: number;
  request: ShotExecutionRequest;
  result?: {
    imageUrls?: string[];
    metadata?: Record<string, unknown>;
  };
  error?: string;
}

export type PromptMode = "rules" | "llm-assisted" | "llm-writer";

export interface Shot {
  id: string;
  shotNumber: number;
  type: "establish" | "wide" | "medium" | "close" | "detail";
  description: string;
  cameraMovement:
    | "static"
    | "pan_left"
    | "pan_right"
    | "zoom_in"
    | "zoom_out"
    | "dolly"
    | "tilt_up"
    | "tilt_down";
  transition: "cut" | "fade" | "dissolve" | "wipe";
  duration: number;
  characters: ShotCharacter[];
  /** LLM 视觉意图草案（LLM 增强模式下由导演 LLM 输出，规则模式下为空） */
  visualIntent?: VisualIntent;
  dialogue?: string;
  narration?: string;
  sfx?: string;
  generatedImage?: string;
  assembledPrompt?: {
    positive: string;
    negative: string;
    parameters: Record<string, unknown>;
  };
  execution?: ShotExecutionSnapshot;
  status: "pending" | "generating" | "completed" | "error" | "regenerating";
  error?: string;
}
