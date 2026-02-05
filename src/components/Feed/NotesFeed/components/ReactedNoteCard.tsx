import { Avatar, Tooltip, Typography } from "@mui/material";
import { nip19 } from "nostr-tools";
import { DEFAULT_IMAGE_URL } from "../../../../utils/constants";
import { useAppContext } from "../../../..//hooks/useAppContext";
import { Event } from "nostr-tools"
import { Notes } from "../../../../components/Notes";

interface ReactedNoteCardProps {
  note: Event;
  reactions: Event[];
}

// Renders an emoji, supporting custom emoji shortcodes like :name:
const RenderEmoji: React.FC<{ content: string; tags?: string[][] }> = ({ content, tags }) => {
  const match = content.match(/^:([a-zA-Z0-9_]+):$/);
  if (match && tags) {
    const shortcode = match[1];
    const emojiTag = tags.find(t => t[0] === "emoji" && t[1] === shortcode);
    if (emojiTag && emojiTag[2]) {
      return (
        <img
          src={emojiTag[2]}
          alt={`:${shortcode}:`}
          title={`:${shortcode}:`}
          style={{ height: "1.2em", width: "auto", verticalAlign: "middle" }}
        />
      );
    }
  }
  return <>{content}</>;
};

const ReactedNoteCard: React.FC<ReactedNoteCardProps> = ({
  note,
  reactions,
}) => {
  const { profiles, fetchUserProfileThrottled } = useAppContext();
  // Filter reactions that belong to this note
  const matchingReactions = reactions.filter((r) => {
    const taggedNoteId = r.tags.find((tag) => tag[0] === "e")?.[1];
    return taggedNoteId === note.id;
  });

  // Group by emoji, preserving tags for custom emoji rendering
  const emojiGroups: Record<string, { pubkeys: string[]; tags?: string[][] }> = {};
  matchingReactions.forEach((r) => {
    const emoji = r.content?.trim() || "👍";
    if (!emojiGroups[emoji]) {
      emojiGroups[emoji] = { pubkeys: [], tags: r.tags };
    }
    emojiGroups[emoji].pubkeys.push(r.pubkey);

    // Pre-fetch profile if not already fetched
    if (!profiles?.get(r.pubkey)) {
      fetchUserProfileThrottled(r.pubkey);
    }
  });

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {Object.entries(emojiGroups).map(([emoji, data]) => (
        <div
          key={emoji}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>
            <RenderEmoji content={emoji} tags={data.tags} />
          </span>
          {data.pubkeys.slice(0, 3).map((pubkey) => {
            const profile = profiles?.get(pubkey);
            const displayName =
              profile?.name || nip19.npubEncode(pubkey).substring(0, 8) + "...";

            return (
              <Tooltip title={displayName} key={pubkey}>
                <Avatar
                  src={profile?.picture || DEFAULT_IMAGE_URL}
                  alt={displayName}
                  sx={{ width: 24, height: 24 }}
                />
              </Tooltip>
            );
          })}
          {data.pubkeys.length > 3 && (
            <Typography variant="caption">
              +{data.pubkeys.length - 3} more
            </Typography>
          )}
        </div>
      ))}

      {/* Your existing Note display */}
      <Notes event={note} />
    </div>
  );
};

export default ReactedNoteCard;
