import { isImageUrl } from "../../utils/common";
import React, { useEffect, useState } from "react";

interface TextWithImagesProps {
  content: string;
}

const urlRegex = /((http|https):\/\/[^\s]+)/g;
const hashtagRegex = /#(\w+)/g;

export const TextWithImages: React.FC<TextWithImagesProps> = ({ content }) => {
  const [text, setText] = useState<string>(content);
  useEffect(() => {
    if (!text) setText(content);
  }, [content]);
  const processContent = () => {
    // Split the content by spaces and new lines to process each segment
    const lines = text?.split(/\n/) || [];

    return lines.map((line, lineIndex) => {
      const parts = line.split(/(\s+)/);

      return (
        <div
          key={lineIndex}
          style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
        >
          {parts.map((part, index) => {
            // Check if the part is an image URL
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

            // Check if the part is a URL
            if (urlRegex.test(part)) {
              const url = part.match(urlRegex)?.[0];
              if (url)
                return (
                  <a
                    href={url}
                    key={index}
                    rel="noopener noreferrer"
                    target="_blank"
                    style={{
                      color: "#FAD13F",
                    }}
                  >
                    {" "}
                    {part}
                  </a>
                );
            }
            // Check if the part is a hashtag
            if (hashtagRegex.test(part)) {
              return (
                <React.Fragment key={index}>
                  <a
                    href={`/search?q=${part}`}
                    style={{ color: "#FAD13F", textDecoration: "underline" }}
                  >
                    {part}
                  </a>
                </React.Fragment>
              );
            }

            return <React.Fragment key={index}>{part}</React.Fragment>;
          })}
          <br /> {/* Preserve line breaks */}
        </div>
      );
    });
  };

  return <>{processContent()}</>;
};
