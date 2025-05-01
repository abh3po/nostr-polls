import React, { useEffect, useState } from "react";
import { Event, SimplePool } from "nostr-tools";
import { defaultRelays } from "../../nostr";
import HashtagCard from "./HashtagCard";

const HashtagsFeed: React.FC = () => {
  const [tags, setTags] = useState<string[]>([]);
  const seen = new Set<string>();

  useEffect(() => {
    const pool = new SimplePool();
    const sub = pool.subscribeMany(
      defaultRelays,
      [{ kinds: [34259], "#m": ["hashtag"] }],
      {
        onevent: (event: Event) => {
          const dTag = event.tags.find((t) => t[0] === "d");
          if (dTag && dTag[1].startsWith("#") && !seen.has(dTag[1])) {
            seen.add(dTag[1]);
            setTags((prev) => [...prev, dTag[1]]);
          }
        },
      }
    );

    return () => sub.close();
  }, []);

  return (
    <>
      {tags.map((tag) => (
        <HashtagCard key={tag} tag={tag} />
      ))}
    </>
  );
};

export default HashtagsFeed;
