import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";
import { Event, nip19 } from "nostr-tools";
import { TextWithImages } from "../Common/TextWithImages";
import { useEffect } from "react";
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
  let { profiles, fetchUserProfileThrottled } = useAppContext();
  let referencedEventId = event.tags.find((t) => t[0] === "e")?.[1];

  useEffect(() => {
    if (!profiles?.has(event.pubkey)) {
      fetchUserProfileThrottled(event.pubkey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeAgo = calculateTimeAgo(event.created_at);

  return (
    <div>
      <Card
        variant="outlined"
        className="poll-response-form"
        style={{ margin: 10 }}
      >
        <CardHeader
          avatar={
            <Avatar
              src={profiles?.get(event.pubkey)?.picture || DEFAULT_IMAGE_URL}
              onClick={() => {
                openProfileTab(nip19.npubEncode(event.pubkey));
              }}
            />
          }
          title={
            profiles?.get(event.pubkey)?.name ||
            profiles?.get(event.pubkey)?.username ||
            profiles?.get(event.pubkey)?.nip05 ||
            nip19.npubEncode(event.pubkey).slice(0, 10) + "..."
          }
          titleTypographyProps={{
            fontSize: 18,
            fontWeight: "bold",
          }}
          subheader={timeAgo}
          style={{ margin: 0, padding: 0, marginLeft: 10, marginTop: 10 }}
        ></CardHeader>
        <Card variant="outlined">
          <CardContent>
            {referencedEventId ? (
              <>
                <Typography style={{ fontSize: 10 }}>replying to: </Typography>
                <div style={{ borderRadius: "1px", borderColor: "grey" }}>
                  <PrepareNote eventId={referencedEventId} />
                </div>
              </>
            ) : null}

            <TextWithImages content={event.content}></TextWithImages>
          </CardContent>
        </Card>
        <FeedbackMenu event={event} />
      </Card>
    </div>
  );
};
