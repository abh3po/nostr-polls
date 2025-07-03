import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type YouTubePlayerProps = {
  url: string;
};

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ url }) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const ytPlayer = useRef<any>(null);

  function extractVideoId(url: string): string | null {
    const regExp = /(?:youtube\.com\/.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match && match[1] ? match[1] : null;
  }

  useEffect(() => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error("Invalid YouTube URL:", url);
      return;
    }

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);

      window.onYouTubeIframeAPIReady = () => {
        createPlayer(videoId);
      };
    } else {
      createPlayer(videoId);
    }

    function createPlayer(videoId: string) {
      if (playerRef.current) {
        ytPlayer.current = new window.YT.Player(playerRef.current, {
          width: "100%",
          height: "100%",
          videoId,
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
          },
        });
      }
    }

    function onPlayerReady(event: any) {
      console.log("Player ready");
    }

    function onPlayerStateChange(event: any) {
      console.log("Player state changed to:", event.data);
    }

    return () => {
      if (ytPlayer.current) {
        ytPlayer.current.destroy();
      }
    };
  }, [url]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1000px",
        margin: "0 auto",
        aspectRatio: "16/9",
      }}
    >
      <div
        ref={playerRef}
        style={{
          width: "100%",
          height: "auto",
        }}
      ></div>
    </div>
  );
};
