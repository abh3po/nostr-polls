// src/types/ollama.d.ts
export {};

declare global {
  interface Window {
    ollama?: {
      getModels: () => Promise<{
        success: boolean;
        data: {
          models: { name: string }[];
        };
        error?: string;
      }>;
      generate?: (params: {
        model: string;
        prompt: string;
        stream?: boolean;
      }) => Promise<{
        success: boolean;
        data: { response: string };
        error?: string;
      }>;
    };
  }
}
