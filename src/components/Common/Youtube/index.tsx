import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    _YTLoading?: boolean;
    _YTLoaded?: boolean;
    _YTCallbacks?: Array<() => void>;
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

  function loadYouTubeAPI(): Promise<void> {
    return new Promise((resolve) => {
      // Already loaded
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      // Already loading — queue callback
      if (window._YTLoading) {
        window._YTCallbacks!.push(resolve);
        return;
      }

      // First load
      window._YTLoading = true;
      window._YTCallbacks = [resolve];

      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);

      window.onYouTubeIframeAPIReady = () => {
        window._YTLoaded = true;
        window._YTLoading = false;

        // run all queued callbacks
        window._YTCallbacks!.forEach((cb) => cb());
        window._YTCallbacks = [];
      };
    });
  }

  useEffect(() => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error("Invalid YouTube URL:", url);
      return;
    }

    let cancelled = false;

    loadYouTubeAPI().then(() => {
      if (cancelled || !playerRef.current) return;

      // Safe now — Player constructor exists
      ytPlayer.current = new window.YT.Player(playerRef.current, {
        width: "100%",
        height: "100%",
        videoId,
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    });

    function onPlayerReady(event: any) {}

    function onPlayerStateChange(event: any) {}

    return () => {
      cancelled = true;
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
