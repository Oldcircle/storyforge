export interface CharacterCard {
  id: string;
  name: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
  appearance: {
    basePrompt: string;
    negativePrompt: string;
    styleModifiers: string;
  };
  consistency: {
    referenceImages: string[];
    lora?: {
      name: string;
      weight: number;
      triggerWord?: string;
    };
    faceId?: string;
    seedBase?: number;
  };
  expressions: Record<
    string,
    {
      promptModifier: string;
      referenceImage?: string;
    }
  >;
  outfits: Record<string, string>;
  personality: string;
  dialogueExamples: string;
  backstory?: string;
  extensions?: Record<string, unknown>;
  tags?: string[];
  creator?: string;
  creatorNotes?: string;
}

export interface ShotCharacter {
  characterId: string;
  emotion: string;
  action: string;
  outfit?: string;
  position: "left" | "center" | "right" | "background";
}
