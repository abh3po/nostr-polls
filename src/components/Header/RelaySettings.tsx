import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  Chip,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useEffect, useState } from "react";
import { useUserContext } from "../../hooks/useUserContext";
import { useRelays } from "../../hooks/useRelays";
import { useAppContext } from "../../hooks/useAppContext";
import { pool } from "../../singletons";

export const RelaySettings: React.FC = () => {
  const [relayConnectionMap, setRelayConnectionMap] = useState<
    Map<string, boolean>
  >(new Map());
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const { relays, isUsingUserRelays } = useRelays();
  const { user } = useUserContext();

  // Function to check relay connections using the existing SimplePool
  const checkConnections = async () => {
    setIsChecking(true);
    const newConnectionMap = new Map<string, boolean>();

    for (const relayUrl of relays) {
      try {
        // Use the SimplePool to check if we can query the relay
        // This is a more reliable way to check connection status
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 5000); // 5 second timeout
        });

        // Try to query a simple event from the relay
        const queryPromise = new Promise<boolean>(async (resolve) => {
          try {
            // Use querySync with a very simple query to test connection
            await pool.querySync([relayUrl], {
              kinds: [0],
              limit: 1,
            });
            resolve(true); // If we get here, the relay is connected
          } catch (e) {
            resolve(false); // Query failed, relay is not connected
          }
        });

        // Race the query against the timeout
        const isConnected = await Promise.race([queryPromise, timeoutPromise]);
        newConnectionMap.set(relayUrl, isConnected);
      } catch (error) {
        console.error(`Error checking relay ${relayUrl}:`, error);
        newConnectionMap.set(relayUrl, false);
      }
    }

    setRelayConnectionMap(newConnectionMap);
    setIsChecking(false);
  };

  useEffect(() => {
    // Initial check
    checkConnections();

    // Set up periodic checking
    const intervalId = setInterval(checkConnections, 30000); // Check every 30 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [relays]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box>
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="subtitle1" sx={{ mr: 1 }}>
            Using:
          </Typography>
          <Chip
            label={isUsingUserRelays ? "Your Relay List" : "Default Relays"}
            color={isUsingUserRelays ? "success" : "default"}
          />
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={() => checkConnections()}
          disabled={isChecking}
          startIcon={
            isChecking ? <CircularProgress size={16} /> : <RefreshIcon />
          }
        >
          Refresh Status
        </Button>
      </Box>

      {relays.length > 0 ? (
        <Table>
          <TableBody>
            {relays.map((relayUrl) => (
              <TableRow key={relayUrl}>
                <TableCell>
                  <Tooltip
                    title={
                      relayConnectionMap.get(relayUrl)
                        ? "Connected"
                        : "Disconnected"
                    }
                  >
                    <LightbulbIcon
                      sx={{
                        color: relayConnectionMap.get(relayUrl)
                          ? "green"
                          : "red",
                      }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>{relayUrl}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography>No relays configured</Typography>
      )}

      {user && (
        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() =>
            window.open("https://primal.net/settings/network", "_blank")
          }
        >
          Edit your relay list on Primal
        </Button>
      )}
    </Box>
  );
};
