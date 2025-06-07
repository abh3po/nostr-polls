import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import { useEffect, useRef, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { defaultRelays } from "../../nostr";
import { Event, Relay } from "nostr-tools";
import { useUserContext } from "../../hooks/useUserContext";

export const RelaySettings: React.FC = () => {
  const [relayListEvent, setRelayListEvent] = useState<Event | null>(null);
  const relayConnectionMap = useRef<Map<string, boolean>>(new Map());
  const { poolRef } = useAppContext();
  const { user } = useUserContext();

  useEffect(() => {
    if (!user) return;
    const fetchRelayList = async () => {
      const filters = { kinds: [10002], authors: [user.pubkey] };
      const results = await poolRef.current.querySync(defaultRelays, filters);
      setRelayListEvent(results[0] || null);
      if (results[0]) checkConnections(results[0]);
    };

    const checkConnections = async (relayEvent: Event) => {
      for (const tag of relayEvent.tags) {
        if (tag[0] === "r") {
          try {
            await Relay.connect(tag[1]);
            relayConnectionMap.current.set(tag[1], true);
          } catch {
            relayConnectionMap.current.set(tag[1], false);
          }
        }
      }
    };

    fetchRelayList();
  }, [user]);

  return (
    <Box>
      {relayListEvent ? (
        <Table>
          <TableBody>
            {relayListEvent.tags
              .filter((t) => t[0] === "r")
              .map((r) => (
                <TableRow key={r[1]}>
                  <TableCell>
                    <LightbulbIcon
                      sx={{
                        color: relayConnectionMap.current.get(r[1])
                          ? "green"
                          : "red",
                      }}
                    />
                  </TableCell>
                  <TableCell>{r[1]}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      ) : (
        <Typography>Loading your relay list...</Typography>
      )}
      <Button
        variant="outlined"
        sx={{ mt: 2 }}
        onClick={() =>
          window.open("https://primal.net/settings/network", "_blank")
        }
      >
        Edit on Primal
      </Button>
    </Box>
  );
};
