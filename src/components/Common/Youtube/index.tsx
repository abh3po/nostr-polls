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

  // Utility to extract the video ID from different YouTube URL formats
  function extractVideoId(url: string): string | null {
    try {
      const regExp = /(?:youtube\.com\/.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(regExp);
      return match && match[1] ? match[1] : null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error("Invalid YouTube URL:", url);
      return;
    }

    // Load the YouTube IFrame API if needed
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
          height: "360",
          width: "640",
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
    <div>
      <div ref={playerRef}></div>
    </div>
  );
};
