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
import { franc } from "franc";
// @ts-ignore
const iso6393to1 = require("iso-639-3-to-1");

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
  const browserLang = navigator.language.slice(0, 2); // e.g., "en"

  useEffect(() => {
    if (!profiles?.has(event.pubkey)) {
      fetchUserProfileThrottled(event.pubkey);
    }

    // Language detection
    const langCode3 = franc(event.content);
    const langCode1 = iso6393to1[langCode3] || "und";
    console.log("LANGCODE 1 IS", langCode1, "BROWSER LANG IS", browserLang)
    if (langCode1 !== browserLang) {
      setShouldShowTranslate(true);
    }
  }, [event.content, event.pubkey, fetchUserProfileThrottled, profiles]);

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const res = await fetch(`${aiSettings.endpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: aiSettings.model,
          prompt: `Translate the following to ${browserLang}:\n\n${event.content}`,
          stream: false,
        }),
      });
  
      const rawText = await res.text();
      console.log("Raw response text from Ollama:", rawText);
  
      if (!res.ok) {
        throw new Error(`API returned error status: ${res.status} ${res.statusText}`);
      }
  
      const data = JSON.parse(rawText);
      setTranslatedText(data.response);
    } catch (err) {
      console.error("Translation failed:", err);
      setTranslatedText("⚠️ Translation failed.");
    }
    setIsTranslating(false);
  };
  

  return (
    <div>
      <Card variant="outlined" className="poll-response-form" style={{ margin: 10 }}>
        <CardHeader
          avatar={
            <Avatar
              src={profiles?.get(event.pubkey)?.picture || DEFAULT_IMAGE_URL}
              onClick={() => openProfileTab(nip19.npubEncode(event.pubkey))}
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
          style={{ margin: 0, padding: 0, marginLeft: 10, marginTop: 10 }}
        />
        <Card variant="outlined">
          <CardContent>
            {referencedEventId && (
              <>
                <Typography style={{ fontSize: 10 }}>replying to: </Typography>
                <div style={{ borderRadius: "1px", borderColor: "grey" }}>
                  <PrepareNote eventId={referencedEventId} />
                </div>
              </>
            )}

            <TextWithImages content={event.content} />

            {/* Translate Button */}
            {shouldShowTranslate && (
              <div style={{ marginTop: 10 }}>
                <Button
                  variant="outlined"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                >
                  {isTranslating ? "Translating..." : "Translate"}
                </Button>
              </div>
            )}

            {/* Translated Output */}
            {translatedText && (
              <Typography style={{ marginTop: 10, fontStyle: "italic" }}>
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
