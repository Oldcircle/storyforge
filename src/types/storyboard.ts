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
  dialogue?: string;
  narration?: string;
  sfx?: string;
  generatedImage?: string;
  assembledPrompt?: {
    positive: string;
    negative: string;
    parameters: Record<string, unknown>;
  };
  status: "pending" | "generating" | "completed" | "error" | "regenerating";
  error?: string;
}
