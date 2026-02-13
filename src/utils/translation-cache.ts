/**
 * Translation cache utilities
 * Stores translations in localStorage to avoid re-translating the same text
 */

const CACHE_PREFIX = "translation_cache_";
const CACHE_VERSION = "v1_";

/**
 * Generate cache key from text and target language
 */
function getCacheKey(text: string, targetLang: string): string {
  // Simple hash function for cache key
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${CACHE_PREFIX}${CACHE_VERSION}${Math.abs(hash)}_${targetLang}`;
}

/**
 * Get cached translation
 */
export function getCachedTranslation(
  text: string,
  targetLang: string
): string | null {
  try {
    const key = getCacheKey(text, targetLang);
    const cached = localStorage.getItem(key);
    if (cached) {
      const data = JSON.parse(cached);
      // Check if cache is less than 30 days old
      const age = Date.now() - data.timestamp;
      if (age < 30 * 24 * 60 * 60 * 1000) {
        return data.translation;
      } else {
        // Remove stale cache
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn("Failed to read translation cache:", error);
  }
  return null;
}

/**
 * Set cached translation
 */
export function setCachedTranslation(
  text: string,
  targetLang: string,
  translation: string
): void {
  try {
    const key = getCacheKey(text, targetLang);
    const data = {
      translation,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    // localStorage full or disabled, ignore
    console.warn("Failed to cache translation:", error);
  }
}

/**
 * Clear all translation cache
 */
export function clearTranslationCache(): void {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn("Failed to clear translation cache:", error);
  }
}
