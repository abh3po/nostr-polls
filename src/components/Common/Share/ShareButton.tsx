import React, { useState } from "react";
import { Tooltip } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { Event, nip19 } from "nostr-tools";
import { useUserContext } from "../../../hooks/useUserContext";
import { useNotification } from "../../../contexts/notification-context";
import { useDMContext } from "../../../hooks/useDMContext";
import ContactSearchDialog from "../../Messages/ContactSearchDialog";

interface ShareButtonProps {
  event: Event;
}

const ShareButton: React.FC<ShareButtonProps> = ({ event }) => {
  const { user } = useUserContext();
  const { showNotification } = useNotification();
  const { sendMessage } = useDMContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = () => {
    if (!user) {
      showNotification("Log in to share posts via DM", "warning");
      return;
    }
    setDialogOpen(true);
  };

  const handleSelect = async (recipientPubkey: string) => {
    try {
      // Build a nostr: URI for the event so TextWithImages will render it
      const neventId = nip19.neventEncode({
        id: event.id,
        kind: event.kind,
        author: event.pubkey,
      });
      const content = `nostr:${neventId}`;

      await sendMessage(recipientPubkey, content);
      showNotification("Sent!", "success");
    } catch (e) {
      console.error("Failed to share via DM:", e);
      showNotification("Failed to send DM", "error");
    }
  };

  return (
    <>
      <div style={{ marginLeft: 20, marginTop: -5 }}>
        <Tooltip title="Share via DM" onClick={handleClick}>
          <span
            style={{
              cursor: "pointer",
              display: "flex",
              flexDirection: "row",
              padding: 2,
            }}
          >
            <SendIcon sx={{ fontSize: 20, transform: "rotate(-45deg)" }} />
          </span>
        </Tooltip>
      </div>
      <ContactSearchDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSelect={handleSelect}
        title="Share with..."
      />
    </>
  );
};

export default ShareButton;
