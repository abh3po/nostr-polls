import { Card, CardContent, Divider } from "@mui/material";
import Rate from "../Ratings/Rate";
import PollComments from "../Common/Comments/PollComments";
import Likes from "../Common/Likes/likes";
import Zap from "../Common/Zaps/zaps";
import { Event } from "nostr-tools";

interface FeedbackMenuProps {
  event: Event;
}

export const FeedbackMenu: React.FC<FeedbackMenuProps> = ({ event }) => {
  return (
    <>
      <Card>
        <CardContent>
          <div
            style={{
              justifyContent: "center",
              display: "flex",
              marginBottom: 10,
            }}
          >
            <Rate entityId={event.id} entityType="event" />
          </div>
          <Divider style={{ marginBottom: 10 }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <PollComments pollEventId={event.id} />
            </div>
            <div>
              <Likes pollEvent={event} />
            </div>
            <div>
              <Zap pollEvent={event} />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
