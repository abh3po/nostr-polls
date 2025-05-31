import React, { useEffect, useState } from "react";
import { PrepareNote } from "../Notes/PrepareNote";
import { nip19 } from "nostr-tools";
import { isImageUrl } from "../../utils/common";
import { useAppContext } from "../../hooks/useAppContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import { EventPointer } from "nostr-tools/lib/types/nip19";

interface TextWithImagesProps {
  content: string;
}

const urlRegex = /((http|https):\/\/[^\s]+)/g;
const hashtagRegex = /#(\w+)/g;
// const nostrRegex = /nostr:([a-z0-9]+)/gi;

const isVideoUrl = (url: string) =>
  /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/.test(url);

export const TextWithImages: React.FC<TextWithImagesProps> = ({ content }) => {
  const [text, setText] = useState<string>(content);
  const { fetchUserProfileThrottled, profiles } = useAppContext();

  useEffect(() => {
    if (!text) setText(content);
  }, [content, text]);

  const processContent = () => {
    const lines = text?.split(/\n/) || [];

    return lines.map((line, lineIndex) => {
      const parts = line.split(/(\s+)/);

      return (
        <div
          key={lineIndex}
          style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
        >
          {parts.map((part, index) => {
            // --- Image ---
            if (isImageUrl(part)) {
              return (
                <img
                  key={index}
                  src={part}
                  alt={`Content ${lineIndex + 1}-${index}`}
                  style={{
                    maxWidth: "100%",
                    marginBottom: "0.5rem",
                    marginRight: "0.5rem",
                    maxHeight: "400px",
                  }}
                />
              );
            }

            // --- Video ---
            if (isVideoUrl(part)) {
              return (
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
              );
            }

            // --- URL ---
            if (urlRegex.test(part)) {
              const url = part.match(urlRegex)?.[0];
              if (url)
                return (
                  <a
                    href={url}
                    key={index}
                    rel="noopener noreferrer"
                    target="_blank"
                    style={{ color: "#FAD13F" }}
                  >
                    {part}
                  </a>
                );
            }

            // --- Hashtag ---
            if (hashtagRegex.test(part)) {
              return (
                <React.Fragment key={index}>
                  <a
                    href={`https://snort.social/t/${part}`}
                    style={{ color: "#FAD13F", textDecoration: "underline" }}
                  >
                    {part}
                  </a>
                </React.Fragment>
              );
            }

            // --- Nostr Links ---
            if (part.startsWith("nostr:")) {
              try {
                const encoded = part.replace("nostr:", "");
                const { type, data } = nip19.decode(encoded);

                if (type === "nevent" || type === "note") {
                  return (
                    <div key={index} style={{ marginTop: "0.5rem" }}>
                      <PrepareNote eventId={(data as EventPointer).id} />
                    </div>
                  );
                }

                if (type === "nprofile" || type === "npub") {
                  const pubkey = type === "nprofile" ? data.pubkey : data;
                  // Optionally fetch profile if not already available
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
                    <a
                      key={index}
                      href={`https://njump.me/${encoded}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#FAD13F",
                        textDecoration: "underline",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <div>
                        <img
                          src={profile?.picture || DEFAULT_IMAGE_URL}
                          alt={name}
                          width={18}
                          height={18}
                          style={{ borderRadius: "50%" }}
                        />
                        {name}
                      </div>
                    </a>
                  );
                }
              } catch (err) {
                // Not a valid nip19 encoded string
                return <span key={index}>{part}</span>;
              }
            }
            // --- Default ---
            return <React.Fragment key={index}>{part}</React.Fragment>;
          })}
          <br />
        </div>
      );
    });
  };
  return <>{processContent()}</>;
};
