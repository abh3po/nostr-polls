import { NRPCClient } from "./nrpc-client";
import { signerManager } from "../singletons/Signer/SignerManager";

/**
 * Response format matching Ollama extension API
 */
export interface OllamaResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Configuration for nRPC AI service
 */
interface AIServiceConfig {
  serverPubkey: string;
  relays: string[];
  timeout?: number;
}

/**
 * AIService - Wrapper around NRPCClient that matches the Ollama extension API
 *
 * This service provides a drop-in replacement for window.ollama:
 * - getModels(): Get list of available AI models
 * - generate(params): Generate text from a prompt
 *
 * Configuration:
 * - Reads from localStorage ("nrpc-ai-config") or environment variables
 * - Uses user's Nostr keys for authentication
 * - Communicates with nRPC server over Nostr relays
 *
 * Usage:
 * ```typescript
 * import { aiService } from './services/ai-service';
 *
 * const modelsResponse = await aiService.getModels();
 * if (modelsResponse.success) {
 *   console.log(modelsResponse.data.models);
 * }
 *
 * const generateResponse = await aiService.generate({
 *   model: "llama3",
 *   prompt: "Translate to Spanish: Hello world",
 * });
 * if (generateResponse.success) {
 *   console.log(generateResponse.data.response);
 * }
 * ```
 */
class AIService {
  private client: NRPCClient | null = null;
  private config: AIServiceConfig | null = null;

  /**
   * Get or create nRPC client
   */
  private getClient(): NRPCClient {
    if (!this.client) {
      const config = this.loadConfig();
      this.client = new NRPCClient({
        serverPubkey: config.serverPubkey,
        relays: config.relays,
        timeout: config.timeout || 30000, // 30s for AI generation
      });
      this.config = config;
    }
    return this.client;
  }

  /**
   * Load configuration from localStorage or environment variables
   */
  private loadConfig(): AIServiceConfig {
    // Try localStorage first (user configuration from AI Settings)
    try {
      const stored = localStorage.getItem("nrpc-ai-config");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.serverPubkey && parsed.relays && Array.isArray(parsed.relays)) {
          return {
            serverPubkey: parsed.serverPubkey,
            relays: parsed.relays,
            timeout: parsed.timeout,
          };
        }
      }
    } catch {
      // Ignore parse errors
    }

    // Fallback to environment variables (defaults)
    const serverPubkey = process.env.REACT_APP_NRPC_SERVER_PUBKEY;
    const relaysStr = process.env.REACT_APP_NRPC_RELAYS;

    if (!serverPubkey || !relaysStr) {
      throw new Error(
        "nRPC AI service not configured. Please configure it in AI Settings."
      );
    }

    return {
      serverPubkey,
      relays: relaysStr.split(",").map((r) => r.trim()),
    };
  }

  /**
   * Get list of available AI models
   *
   * Matches Ollama extension API:
   * { success: true, data: { models: [{ name: "llama3" }, ...] } }
   */
  async getModels(): Promise<OllamaResponse<{ models: { name: string }[] }>> {
    try {
      // Check if user is logged in
      const signer = await signerManager.getSigner();
      if (!signer) {
        return {
          success: false,
          error: "You must be logged in to use AI features",
        };
      }

      // Make nRPC call
      const client = this.getClient();
      const result = await client.call("getAIModels", {}, signer);

      // Parse result
      // Result is array of { model: "name" } objects
      let models: { name: string }[];

      if (Array.isArray(result)) {
        models = result.map((item: any) => ({
          name: typeof item === "string" ? item : item.model || item.name,
        }));
      } else if (typeof result === "object" && result.model) {
        models = [{ name: result.model }];
      } else {
        throw new Error("Unexpected response format from getAIModels");
      }

      return {
        success: true,
        data: { models },
      };
    } catch (error: any) {
      console.error("AI service error (getModels):", error);
      return {
        success: false,
        error: error.message || "Failed to fetch AI models",
      };
    }
  }

  /**
   * Generate text from a prompt
   *
   * Matches Ollama extension API:
   * { success: true, data: { response: "generated text..." } }
   *
   * @param params.model - Model name (e.g., "llama3")
   * @param params.prompt - Text prompt
   * @param params.stream - Streaming (not yet supported, ignored)
   */
  async generate(params: {
    model: string;
    prompt: string;
    stream?: boolean;
  }): Promise<OllamaResponse<{ response: string }>> {
    try {
      // Validate params
      if (!params.model || !params.prompt) {
        return {
          success: false,
          error: "model and prompt are required",
        };
      }

      // Check if user is logged in
      const signer = await signerManager.getSigner();
      if (!signer) {
        return {
          success: false,
          error: "You must be logged in to use AI features",
        };
      }

      // Make nRPC call
      const client = this.getClient();
      const result = await client.call(
        "generatePrompt",
        {
          model: params.model,
          prompt: params.prompt,
        },
        signer
      );

      // Parse result
      let response: string;

      if (typeof result === "string") {
        response = result;
      } else if (typeof result === "object" && result.response) {
        response = result.response;
      } else {
        throw new Error("Unexpected response format from generatePrompt");
      }

      return {
        success: true,
        data: { response },
      };
    } catch (error: any) {
      console.error("AI service error (generate):", error);

      // Provide helpful error messages
      let errorMessage = error.message || "Failed to generate response";

      if (error.message?.includes("timeout")) {
        errorMessage = "AI service timeout. The request took too long.";
      } else if (error.message?.includes("not configured")) {
        errorMessage = "AI service not configured. Please contact the administrator.";
      } else if (error.nrpcError && error.status === 503) {
        errorMessage = "AI service unavailable. The server may be down or Ollama is not running.";
      } else if (error.nrpcError && error.status === 400) {
        errorMessage = error.message; // Use server's validation message
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Translate text (batched: detects language + translates in one call)
   *
   * More efficient than calling generate() twice for language detection and translation.
   *
   * @param params.model - Model name (e.g., "llama3")
   * @param params.text - Text to translate
   * @param params.targetLang - Target language code (e.g., "en", "es")
   * @returns Object with detectedLang, needsTranslation, and translation
   */
  async translateText(params: {
    model: string;
    text: string;
    targetLang: string;
  }): Promise<
    OllamaResponse<{
      detectedLang: string;
      needsTranslation: boolean;
      translation: string;
    }>
  > {
    try {
      // Validate params
      if (!params.model || !params.text || !params.targetLang) {
        return {
          success: false,
          error: "model, text, and targetLang are required",
        };
      }

      // Check if user is logged in
      const signer = await signerManager.getSigner();
      if (!signer) {
        return {
          success: false,
          error: "You must be logged in to use AI features",
        };
      }

      // Make nRPC call
      const client = this.getClient();
      const result = await client.call(
        "translateText",
        {
          model: params.model,
          text: params.text,
          targetLang: params.targetLang,
        },
        signer
      );

      // Parse result
      return {
        success: true,
        data: {
          detectedLang: result.detectedLang || "en",
          needsTranslation: result.needsTranslation === "true",
          translation: result.translation || params.text,
        },
      };
    } catch (error: any) {
      console.error("AI service error (translateText):", error);

      let errorMessage = error.message || "Translation failed";

      if (error.message?.includes("timeout")) {
        errorMessage = "AI service timeout. The request took too long.";
      } else if (error.nrpcError && error.status === 503) {
        errorMessage =
          "AI service unavailable. The server may be down or Ollama is not running.";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Batch detect languages for multiple texts (more efficient than calling generate() multiple times)
   *
   * @param params.model - Model name (e.g., "llama3")
   * @param params.texts - Array of texts to detect languages for
   * @returns Array of ISO 639-1 language codes in the same order
   */
  async batchDetectLanguages(params: {
    model: string;
    texts: string[];
  }): Promise<OllamaResponse<string[]>> {
    try {
      // Validate params
      if (!params.model || !params.texts || !Array.isArray(params.texts)) {
        return {
          success: false,
          error: "model and texts array are required",
        };
      }

      if (params.texts.length === 0) {
        return { success: true, data: [] };
      }

      // Check if user is logged in
      const signer = await signerManager.getSigner();
      if (!signer) {
        return {
          success: false,
          error: "You must be logged in to use AI features",
        };
      }

      // Make nRPC call
      const client = this.getClient();
      const result = await client.call(
        "batchDetectLanguages",
        {
          model: params.model,
          texts: JSON.stringify(params.texts),
        },
        signer
      );

      // Parse result (should be a JSON array)
      let languages: string[];
      if (typeof result === "string") {
        languages = JSON.parse(result);
      } else if (Array.isArray(result)) {
        languages = result;
      } else if (result.result_json) {
        languages = JSON.parse(result.result_json);
      } else {
        throw new Error("Unexpected response format from batchDetectLanguages");
      }

      return {
        success: true,
        data: languages,
      };
    } catch (error: any) {
      console.error("AI service error (batchDetectLanguages):", error);
      return {
        success: false,
        error: error.message || "Batch language detection failed",
      };
    }
  }

  /**
   * Enhance post with typo corrections and hashtag suggestions
   * Uses the generic generatePrompt method with a structured prompt
   *
   * @param params.model - Model name (e.g., "llama3")
   * @param params.text - Post text to enhance
   * @returns Object with typos, hashtags, and correctedText
   */
  async enhancePost(params: {
    model: string;
    text: string;
  }): Promise<
    OllamaResponse<{
      typos: Array<{ original: string; correction: string; position: number }>;
      hashtags: string[];
      correctedText: string;
    }>
  > {
    try {
      // Build the prompt
      const prompt = `You are a social media assistant. Analyze this post and suggest improvements.

IMPORTANT: Read the post carefully and suggest hashtags that are DIRECTLY related to the actual content and topics discussed in the post. DO NOT suggest generic or random hashtags.

Return ONLY a JSON object with this exact structure (no markdown, no extra text):

{
  "typos": [
    {"original": "wrong_word", "correction": "correct_word", "position": 0}
  ],
  "hashtags": ["specific", "relevant", "contextual"],
  "correctedText": "The corrected text"
}

Rules:
1. typos: Include spelling mistakes AND grammar errors (e.g., "your" vs "you're", "their" vs "there", subject-verb agreement, tense consistency, missing articles)
   - List each individual correction found
   - Include the exact wrong word/phrase and the correction
2. hashtags: Suggest 3-5 hashtags that are SPECIFICALLY about the topics mentioned in this post
   - Analyze what the post is actually about
   - Suggest hashtags that match those specific topics
   - DO NOT suggest generic hashtags like "life", "thoughts", "social"
   - If the post is about Bitcoin, suggest Bitcoin-related tags
   - If the post is about coding, suggest coding-related tags
   - Match the hashtags to the post's actual subject matter
3. correctedText: The text with ALL spelling and grammar corrections applied
   - Fix spelling mistakes
   - Fix grammar errors
   - Preserve the original meaning, tone, and style
   - Keep informal language if intentional (e.g., "gonna", "wanna" are okay)
4. Don't suggest hashtags already in the text

Post to analyze:
${params.text}

JSON:`;

      // Use existing generate method
      const result = await this.generate({
        model: params.model,
        prompt,
        stream: false,
      });

      if (!result.success || !result.data?.response) {
        return {
          success: false,
          error: result.error || "Failed to generate suggestions",
        };
      }

      // Parse JSON response
      let data;
      try {
        // Try to extract JSON from response
        const jsonMatch = result.data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: return empty suggestions
          data = {
            typos: [],
            hashtags: [],
            correctedText: params.text,
          };
        }

        // Validate structure
        if (!data.typos || !data.hashtags || !data.correctedText) {
          data = {
            typos: data.typos || [],
            hashtags: data.hashtags || [],
            correctedText: data.correctedText || params.text,
          };
        }
      } catch (error) {
        // If parsing fails, return empty suggestions
        data = {
          typos: [],
          hashtags: [],
          correctedText: params.text,
        };
      }

      return {
        success: true,
        data: {
          typos: data.typos || [],
          hashtags: data.hashtags || [],
          correctedText: data.correctedText || params.text,
        },
      };
    } catch (error: any) {
      console.error("AI service error (enhancePost):", error);
      return {
        success: false,
        error: error.message || "Post enhancement failed",
      };
    }
  }

  /**
   * Summarize long post content
   *
   * @param params.model - Model name (e.g., "llama3")
   * @param params.text - Post text to summarize
   * @returns Summary of the post
   */
  async summarizePost(params: {
    model: string;
    text: string;
  }): Promise<OllamaResponse<{ summary: string }>> {
    try {
      if (!params.model || !params.text) {
        return {
          success: false,
          error: "model and text are required",
        };
      }

      const prompt = `Summarize the following post in 2-3 concise sentences. Capture the main points and key ideas. Be clear and factual.

Post:
${params.text}

Summary:`;

      const result = await this.generate({
        model: params.model,
        prompt,
        stream: false,
      });

      if (!result.success || !result.data?.response) {
        return {
          success: false,
          error: result.error || "Failed to generate summary",
        };
      }

      return {
        success: true,
        data: {
          summary: result.data.response.trim(),
        },
      };
    } catch (error: any) {
      console.error("AI service error (summarizePost):", error);
      return {
        success: false,
        error: error.message || "Summary generation failed",
      };
    }
  }

  /**
   * Update AI service configuration (for advanced users)
   *
   * @param config - New configuration
   */
  updateConfig(config: Partial<AIServiceConfig>): void {
    try {
      const current = this.loadConfig();
      const updated = { ...current, ...config };
      localStorage.setItem("nrpc-ai-config", JSON.stringify(updated));

      // Reset client to pick up new config
      this.client = null;
      this.config = null;
    } catch (error) {
      console.error("Failed to update AI config:", error);
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
