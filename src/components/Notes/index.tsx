import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
} from "@mui/material";
import { Event, nip19 } from "nostr-tools";
import { TextWithImages } from "../Common/TextWithImages";
import { useEffect, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { openProfileTab } from "../../nostr";
import { calculateTimeAgo } from "../../utils/common";
import { PrepareNote } from "./PrepareNote";
import { FeedbackMenu } from "../FeedbackMenu";

interface NotesProps {
  event: Event;
}

export const Notes: React.FC<NotesProps> = ({ event }) => {
  const { profiles, fetchUserProfileThrottled, aiSettings } = useAppContext();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [shouldShowTranslate, setShouldShowTranslate] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const referencedEventId = event.tags.find((t) => t[0] === "e")?.[1];
  const timeAgo = calculateTimeAgo(event.created_at);
  const browserLang = navigator.language.slice(0, 2).toLowerCase();

  const hasOllama =
    typeof window !== "undefined" &&
    window.ollama &&
    typeof window.ollama.generate === "function";

  useEffect(() => {
    if (!profiles?.has(event.pubkey)) {
      fetchUserProfileThrottled(event.pubkey);
    }

    if (!hasOllama) return;

    const detectLanguage = async () => {
      const prompt = `Detect the ISO 639-1 language code of the following text. Ignore hashes, URLs, or random text. Respond ONLY with the two-letter code (e.g., "en"). If unsure, default to "en":\n\n${event.content}`;
      try {
        const result = await window.ollama!.generate!({
          model: aiSettings.model,
          prompt,
          stream: false,
        });

        if (!result.success) throw new Error(result.error);
        const lang = result.data.response.trim().slice(0, 2).toLowerCase();
        if (lang !== browserLang) {
          setShouldShowTranslate(true);
        }
      } catch (err) {
        console.error("Language detection failed:", err);
      }
    };

    detectLanguage();
  }, [
    event.content,
    event.pubkey,
    fetchUserProfileThrottled,
    profiles,
    aiSettings,
    browserLang,
    hasOllama,
  ]);

  const handleTranslate = async () => {
    setIsTranslating(true);
    const prompt = `Translate the following to ${browserLang}. The text may contain hashes, URLs, or nostr IDs; ignore them.\n\n${event.content}`;

    try {
      const result = await window.ollama!.generate!({
        model: aiSettings.model || "llama3",
        prompt,
        stream: false,
      });

      if (!result.success) {
        throw new Error(result.error || "Ollama failed");
      }

      setTranslatedText(result.data.response);
    } catch (err) {
      console.error("Translation failed:", err);
      setTranslatedText("⚠️ Translation failed.");
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div>
      <Card variant="outlined" style={{ margin: 10 }}>
        <CardHeader
          avatar={
            <Avatar
              src={profiles?.get(event.pubkey)?.picture || DEFAULT_IMAGE_URL}
              onClick={() => openProfileTab(nip19.npubEncode(event.pubkey))}
              sx={{ cursor: "pointer" }}
            />
          }
          title={
            profiles?.get(event.pubkey)?.name ||
            profiles?.get(event.pubkey)?.username ||
            profiles?.get(event.pubkey)?.nip05 ||
            nip19.npubEncode(event.pubkey).slice(0, 10) + "..."
          }
          titleTypographyProps={{ fontSize: 18, fontWeight: "bold" }}
          subheader={timeAgo}
          sx={{ m: 0, p: 0, ml: 1, mt: 1 }}
        />
        <Card variant="outlined">
          <CardContent>
            {referencedEventId && (
              <>
                <Typography variant="caption">replying to:</Typography>
                <PrepareNote eventId={referencedEventId} />
              </>
            )}

            <TextWithImages content={event.content} />

            {hasOllama && shouldShowTranslate && (
              <div style={{ marginTop: 10 }}>
                <Button
                  variant="text"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                >
                  {isTranslating ? "Translating..." : "Translate"}
                </Button>
              </div>
            )}

            {translatedText && (
              <Typography mt={2} fontStyle="italic">
                {translatedText}
              </Typography>
            )}
          </CardContent>
        </Card>
        <FeedbackMenu event={event} />
      </Card>
    </div>
  );
};
