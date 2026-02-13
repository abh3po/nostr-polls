import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { aiService } from "../services/ai-service";

interface LanguageDetectionRequest {
  text: string;
  resolve: (lang: string) => void;
  reject: (error: any) => void;
}

interface TranslationBatchContextValue {
  detectLanguage: (text: string, model: string) => Promise<string>;
}

const TranslationBatchContext = createContext<TranslationBatchContextValue | null>(
  null
);

export const useTranslationBatch = () => {
  const context = useContext(TranslationBatchContext);
  if (!context) {
    throw new Error(
      "useTranslationBatch must be used within TranslationBatchProvider"
    );
  }
  return context;
};

interface Props {
  children: ReactNode;
}

/**
 * TranslationBatchProvider - Batches language detection requests
 *
 * Instead of each post making a separate nRPC call to detect language,
 * this provider collects all requests within a 100ms window and batches
 * them into a single nRPC call.
 *
 * Example: Feed with 10 posts → 1 nRPC call instead of 10
 */
export const TranslationBatchProvider: React.FC<Props> = ({ children }) => {
  const queueRef = useRef<Map<string, LanguageDetectionRequest[]>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const processBatch = useCallback(async (model: string) => {
    const queue = queueRef.current.get(model);
    if (!queue || queue.length === 0) return;

    // Clear this model's queue
    queueRef.current.delete(model);

    const texts = queue.map((req) => req.text);

    try {
      // Make batched nRPC call
      const response = await aiService.batchDetectLanguages({
        model,
        texts,
      });

      if (response.success && response.data) {
        const languages = response.data;

        // Resolve each request with its corresponding language
        queue.forEach((req, index) => {
          const lang = languages[index] || "en";
          req.resolve(lang);
        });
      } else {
        // If batch call failed, reject all requests
        const error = new Error(response.error || "Batch detection failed");
        queue.forEach((req) => req.reject(error));
      }
    } catch (error) {
      // If batch call failed, reject all requests
      queue.forEach((req) => req.reject(error));
    }
  }, []);

  const detectLanguage = useCallback(
    (text: string, model: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        // Add to queue
        const modelQueue = queueRef.current.get(model) || [];
        modelQueue.push({ text, resolve, reject });
        queueRef.current.set(model, modelQueue);

        // Clear existing timer
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        // Set new timer to process batch after 100ms
        // This allows multiple requests to accumulate
        timerRef.current = setTimeout(() => {
          processBatch(model);
          timerRef.current = null;
        }, 100);
      });
    },
    [processBatch]
  );

  return (
    <TranslationBatchContext.Provider value={{ detectLanguage }}>
      {children}
    </TranslationBatchContext.Provider>
  );
};
