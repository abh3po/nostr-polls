import { useEffect, useRef, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { defaultRelays } from "../../nostr";
import { Event, Relay } from "nostr-tools";
import {
  Box,
  Button,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import { useUserContext } from "../../hooks/useUserContext";

interface RelayModalProps {
  showRelays: boolean;
  onClose: () => void;
}
export const RelayModal: React.FC<RelayModalProps> = ({
  showRelays,
  onClose,
}) => {
  const [relayListEvent, setRelayListEvent] = useState<Event | null>(null);
  const [isOpen, setIsOpen] = useState(showRelays);
  const relayConnectionMap = useRef<Map<string, boolean>>(new Map());
  let { poolRef } = useAppContext();
  const { user } = useUserContext();
  const fetchRelayList = async () => {
    if (!user || !isOpen) return;

    let filters = {
      kinds: [10002],
      authors: [user.pubkey],
    };
    let results = await poolRef.current.querySync(defaultRelays, filters);
    setRelayListEvent(results[0] || null);
    if (results[0]) checkRelayConnection(results[0]);
  };

  async function checkRelayConnection(relayEvent: Event) {
    relayEvent.tags.forEach((tag) => {
      if (tag[0] === "r") {
        Relay.connect(tag[1]).then(
          (relay) => {
            relayConnectionMap.current.set(tag[1], true);
          },
          (reason: any) => {
            relayConnectionMap.current.set(tag[1], false);
          }
        );
      }
    });
  }

  useEffect(() => {
    if (!relayListEvent) fetchRelayList();
    setIsOpen(showRelays);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRelays, user, relayConnectionMap]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      style={{ top: "15%", maxWidth: "80%", left: "10%" }}
    >
      <div>
        <h3 style={{ color: "#FAD13F" }}>Relays</h3>
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            color: "black",
            backgroundColor: "white",
            minHeight: 400,
          }}
        >
          {relayListEvent ? (
            <Table style={{ overflow: "scroll" }}>
              <TableBody>
                {relayListEvent.tags
                  .filter((t) => t[0] === "r")
                  .map((r) => {
                    return (
                      <TableRow key={r[1]}>
                        <TableCell>
                          {
                            <LightbulbIcon
                              sx={{
                                color: relayConnectionMap.current.get(r[1])
                                  ? "green"
                                  : "red",
                              }}
                            />
                          }
                        </TableCell>
                        <TableCell>{r[1]}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          ) : (
            <Typography> Looking for your Relay List...</Typography>
          )}
          <Button
            variant="contained"
            style={{ margin: 10 }}
            onClick={() => {
              window.open("https://primal.net/settings/network", "_blank");
            }}
          >
            Edit Relays
          </Button>
        </Box>
      </div>
    </Modal>
  );
};
