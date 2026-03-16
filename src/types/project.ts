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
  storyboardIds: string[];
  settings: {
    outputFormat: "image_sequence";
    aspectRatio: string;
    targetDuration?: number;
  };
}
