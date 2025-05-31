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

  // Group by emoji
  const emojiGroups: Record<string, string[]> = {};
  matchingReactions.forEach((r) => {
    const emoji = r.content?.trim() || "👍";
    if (!emojiGroups[emoji]) emojiGroups[emoji] = [];
    emojiGroups[emoji].push(r.pubkey);

    // Pre-fetch profile if not already fetched
    if (!profiles?.get(r.pubkey)) {
      fetchUserProfileThrottled(r.pubkey);
    }
  });

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {Object.entries(emojiGroups).map(([emoji, pubkeys]) => (
        <div
          key={emoji}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>{emoji}</span>
          {pubkeys.slice(0, 3).map((pubkey) => {
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
          {pubkeys.length > 3 && (
            <Typography variant="caption">
              +{pubkeys.length - 3} more
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
