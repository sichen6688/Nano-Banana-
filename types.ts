export enum AspectRatio {
  SQUARE = "1:1",
  PORTRAIT_3_4 = "3:4",
  LANDSCAPE_4_3 = "4:3",
  PORTRAIT_9_16 = "9:16",
  LANDSCAPE_16_9 = "16:9",
}

export interface GeneratedImage {
  id: string;
  url: string; // Base64
  prompt: string;
  aspectRatio: AspectRatio;
  timestamp: number;
}

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

export interface Task {
  id: string;
  prompt: string;
  status: GenerationStatus;
  referenceImages: string[]; // Changed from single string | null to array
  generatedImages: GeneratedImage[];
  error?: string;
}

export interface GenerationRequest {
  prompt: string;
  aspectRatio: AspectRatio;
  referenceImages?: string[];
}