import React, { useEffect, useRef, useState } from "react";
import { PrepareNote } from "../../Notes/PrepareNote";
import { nip19 } from "nostr-tools";
import { isImageUrl } from "../../../utils/common";
import { useAppContext } from "../../../hooks/useAppContext";
import { DEFAULT_IMAGE_URL } from "../../../utils/constants";
import { IconButton, Tooltip } from "@mui/material";
import { TranslationPopover } from "./../TranslationPopover";
import TranslateIcon from "@mui/icons-material/Translate";
import { isEmbeddableYouTubeUrl } from "../Utils";
import { YouTubePlayer } from "../Youtube";
import { Link } from "react-router-dom";

interface TextWithImagesProps {
  content: string;
}

const urlRegex = /((http|https):\/\/[^\s]+)/g;
const hashtagRegex = /#(\w+)/g;
const isVideoUrl = (url: string) =>
  /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/.test(url);

// ---- Parsers ----

const YouTubeParser = ({ part }: { part: string }) => {
  return isEmbeddableYouTubeUrl(part) ? <YouTubePlayer url={part} /> : null;
};

const ImageParser = ({ part, index }: { part: string; index: number }) => {
  return isImageUrl(part) ? (
    <img
      key={index}
      src={part}
      alt={`img-${index}`}
      style={{
        maxWidth: "100%",
        marginBottom: "0.5rem",
        maxHeight: "400px",
      }}
    />
  ) : null;
};

const VideoParser = ({ part, index }: { part: string; index: number }) => {
  return isVideoUrl(part) ? (
    <video
      key={index}
      src={part}
      controls
      style={{
        maxWidth: "100%",
        marginBottom: "0.5rem",
        maxHeight: "400px",
      }}
    />
  ) : null;
};

const URLParser = ({ part, index }: { part: string; index: number }) => {
  const url = part.match(urlRegex)?.[0];
  return url ? (
    <a
      href={url}
      key={index}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "#FAD13F" }}
    >
      {part}
    </a>
  ) : null;
};

const HashtagParser = ({ part, index }: { part: string; index: number }) => {
  return hashtagRegex.test(part) ? (
    <a
      key={index}
      href={`/feeds/topics/${part.replace("#", "")}`}
      style={{ color: "#FAD13F", textDecoration: "underline" }}
    >
      {part}
    </a>
  ) : null;
};

const NostrParser = ({
  part,
  index,
  profiles,
  fetchUserProfileThrottled,
}: {
  part: string;
  index: number;
  profiles: Map<string, any> | undefined;
  fetchUserProfileThrottled: (pubkey: string) => void;
}) => {
  if (!part.startsWith("nostr:")) return null;

  try {
    const encoded = part.replace("nostr:", "");
    const { type, data } = nip19.decode(encoded);
    if (type === "nevent") {
      return (
        <div key={index} style={{ marginTop: "0.5rem", zoom: 0.85 }}>
          <PrepareNote neventId={encoded} />
        </div>
      );
    }
    if (type === "note") {
      const neventId = nip19.neventEncode({
        id: data,
        kind: 1,
      });
      return (
        <div key={index} style={{ marginTop: "0.5rem", zoom: 0.85 }}>
          <PrepareNote neventId={neventId} />
        </div>
      );
    }

    if (type === "nprofile" || type === "npub") {
      const pubkey = type === "nprofile" ? data.pubkey : data;
      if (!profiles?.has(pubkey)) {
        fetchUserProfileThrottled(pubkey);
      }

      const profile = profiles?.get(pubkey);
      const name =
        profile?.name ||
        profile?.username ||
        profile?.nip05 ||
        pubkey.slice(0, 8) + "...";

      return (
        <Link
          key={index}
          to={`/profile/${encoded}`}
          style={{
            color: "#FAD13F",
            textDecoration: "underline",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          <img
            src={profile?.picture || DEFAULT_IMAGE_URL}
            alt={name}
            width={18}
            height={18}
            style={{ borderRadius: "50%" }}
          />
          {name}
        </Link>
      );
    }
  } catch (err) {
    console.warn("Nostr URI parsing failed:", err);
    return null;
  }
  return null;
};

const PlainTextRenderer = ({ part }: { part: string; key?: string }) => {
  return <React.Fragment>{part}</React.Fragment>;
};

// ---- Main Component ----

export const TextWithImages: React.FC<TextWithImagesProps> = ({ content }) => {
  const [displayedText, setDisplayedText] = useState<string>(content);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [shouldShowTranslate, setShouldShowTranslate] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const translateButtonRef = useRef<HTMLButtonElement | null>(null);

  const { aiSettings, fetchUserProfileThrottled, profiles } = useAppContext();
  const browserLang = navigator.language.slice(0, 2).toLowerCase();

  const hasOllama =
    typeof window !== "undefined" &&
    window.ollama &&
    typeof window.ollama.generate === "function";

  useEffect(() => {
    setDisplayedText(content);
    if (!hasOllama) return;

    const detectLang = async () => {
      try {
        const prompt = `Determine the language of the following text. Only respond with the ISO 639-1 language code (e.g., "en", "es", "fr").
Ignore:
- URLs (http links)
- Hashes
- Random alphanumeric strings or identifiers

Default to "en" unless you're very confident it's another language.
Text:\n\n${content}`;

        const result = await window.ollama!.generate!({
          model: aiSettings.model || "llama3",
          prompt,
          stream: false,
        });

        const rawLang = result?.data?.response?.trim();
        if (rawLang && /^[a-z]{2}$/.test(rawLang.toLowerCase())) {
          const lang = rawLang.toLowerCase();
          setShouldShowTranslate(lang !== browserLang);
        } else {
          setShouldShowTranslate(false);
        }
      } catch (err) {
        console.warn("Language detection failed:", err);
        setShouldShowTranslate(false);
      }
    };

    detectLang();
  }, [content, aiSettings.model, browserLang, hasOllama]);

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const prompt = `Translate the following text to ${browserLang}. You may skip or preserve hashes, URLs, and nostr identifiers:\n\n${content}`;

      const result = await window.ollama!.generate!({
        model: aiSettings.model || "llama3",
        prompt,
        stream: false,
      });

      const translated = result?.data?.response?.trim();
      setTranslatedText(translated || "⚠️ Translation failed.");
    } catch (err) {
      console.error("Translation failed:", err);
      setTranslatedText("⚠️ Translation failed.");
    } finally {
      setIsTranslating(false);
    }
  };

  const renderContent = (text: string) => {
    const lines = text.split(/\n/);
    return lines.map((line, lineIndex) => {
      const parts = line.split(/(\s+)/);
      return (
        <div key={lineIndex} style={{ wordBreak: "break-word" }}>
          {parts.map((part, index) => {
            const key = `${lineIndex}-${index}`;
            const parserResult =
              YouTubeParser({ part }) ||
              ImageParser({ part, index }) ||
              VideoParser({ part, index }) ||
              URLParser({ part, index }) ||
              HashtagParser({ part, index }) ||
              NostrParser({
                part,
                index,
                profiles,
                fetchUserProfileThrottled,
              });

            return parserResult ?? <PlainTextRenderer part={part} key={key} />;
          })}
          <br />
        </div>
      );
    });
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        minWidth: 0,
      }}
    >
      <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>{renderContent(displayedText)}</div>
      {hasOllama && shouldShowTranslate && (
        <div>
          <Tooltip title="Translate">
            <span>
              <IconButton
                ref={translateButtonRef}
                onClick={handleTranslate}
                disabled={isTranslating}
                size="small"
                color="primary"
              >
                <TranslateIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      )}
      <TranslationPopover
        translatedText={translatedText}
        buttonRef={translateButtonRef.current}
        open={!!translatedText}
        onClose={() => setTranslatedText(null)}
      />
    </div>
  );
};
