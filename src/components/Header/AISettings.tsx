import {
  Box,
  TextField,
  MenuItem,
  CircularProgress,
  Typography,
  Button,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import { aiService } from "../../services/ai-service";

const LOCAL_STORAGE_KEY = "ai-settings";
const NRPC_CONFIG_KEY = "nrpc-ai-config";
const NRPC_DOCS_LINK = "https://github.com/formstr-hq/formstr-nrpc-server";

// Default values
const DEFAULT_SERVER_PUBKEY = process.env.REACT_APP_NRPC_SERVER_PUBKEY || "";
const DEFAULT_RELAYS =
  process.env.REACT_APP_NRPC_RELAYS ||
  "wss://relay.damus.io,wss://relay.snort.social";

export const AISettings: React.FC = () => {
  const { aiSettings, setAISettings } = useAppContext();

  const [localModel, setLocalModel] = useState(aiSettings.model || "");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // nRPC server configuration
  const [serverPubkey, setServerPubkey] = useState("");
  const [relays, setRelays] = useState("");

  // Load nRPC config from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NRPC_CONFIG_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        setServerPubkey(config.serverPubkey || DEFAULT_SERVER_PUBKEY);
        setRelays((config.relays || []).join(",") || DEFAULT_RELAYS);
      } else {
        setServerPubkey(DEFAULT_SERVER_PUBKEY);
        setRelays(DEFAULT_RELAYS);
      }
    } catch {
      setServerPubkey(DEFAULT_SERVER_PUBKEY);
      setRelays(DEFAULT_RELAYS);
    }
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiService.getModels();
      if (
        response.success &&
        response.data &&
        Array.isArray(response.data.models)
      ) {
        const models = response.data.models.map((m: any) => m.name);
        setAvailableModels(models);
      } else {
        setError(response.error || "⚠️ Failed to fetch AI models.");
      }
    } catch (err: any) {
      setError(err?.message || "⚠️ Failed to communicate with AI service.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch models when component mounts and config is loaded
  useEffect(() => {
    if (serverPubkey && relays) {
      fetchModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPubkey, relays]);

  const handleSaveConfig = () => {
    // Validate inputs
    if (!serverPubkey.trim()) {
      setError("Server public key is required");
      return;
    }
    if (!relays.trim()) {
      setError("At least one relay is required");
      return;
    }

    // Save nRPC config
    const config = {
      serverPubkey: serverPubkey.trim(),
      relays: relays
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
    };
    localStorage.setItem(NRPC_CONFIG_KEY, JSON.stringify(config));

    // Update aiService with new config
    aiService.updateConfig(config);

    // Refresh models list
    setAvailableModels([]);
    setLocalModel("");
    fetchModels();

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveModel = () => {
    const newSettings = { model: localModel };
    setAISettings(newSettings);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSettings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Box p={2} sx={{ bgcolor: "background.paper", color: "text.primary" }}>
      <Typography variant="h6" gutterBottom>
        AI Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        AI features are powered by nRPC. Configure your server below.
      </Typography>

      {/* nRPC Server Configuration */}
      <Accordion defaultExpanded sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">nRPC Server Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <TextField
              label="Server Public Key (hex or npub)"
              fullWidth
              value={serverPubkey}
              onChange={(e) => {
                setServerPubkey(e.target.value);
                setSaved(false);
              }}
              margin="normal"
              placeholder="npub1... or hex pubkey"
              helperText="The public key of your nRPC AI server"
            />
            <TextField
              label="Relays (comma-separated)"
              fullWidth
              value={relays}
              onChange={(e) => {
                setRelays(e.target.value);
                setSaved(false);
              }}
              margin="normal"
              placeholder="wss://relay.damus.io,wss://relay.snort.social"
              helperText="Nostr relays to use for nRPC communication"
            />
            <Box mt={2} display="flex" alignItems="center" gap={2}>
              <Button
                variant="outlined"
                onClick={handleSaveConfig}
                disabled={loading}
              >
                Save & Reload Models
              </Button>
              <Link
                href={NRPC_DOCS_LINK}
                target="_blank"
                rel="noopener"
                underline="hover"
                variant="body2"
              >
                Setup your own nRPC server:
              </Link>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Model Selection */}
      <Box mt={3}>
        <Typography variant="subtitle1" gutterBottom>
          Model Selection
        </Typography>

        {loading ? (
          <Box mt={2} display="flex" alignItems="center">
            <CircularProgress size={20} />
            <Typography variant="body2" ml={1}>
              Loading models from nRPC server…
            </Typography>
          </Box>
        ) : availableModels.length > 0 ? (
          <>
            <TextField
              select
              label="Select Model"
              fullWidth
              value={localModel}
              onChange={(e) => {
                setLocalModel(e.target.value);
                setSaved(false);
              }}
              margin="normal"
            >
              {availableModels.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
            <Box mt={2} display="flex" alignItems="center" gap={2}>
              <Button
                variant="contained"
                onClick={handleSaveModel}
                disabled={!localModel}
              >
                Save Model
              </Button>
              {saved && (
                <Typography variant="body2" color="success.main">
                  ✅ Settings saved
                </Typography>
              )}
            </Box>
          </>
        ) : (
          <Typography mt={2} variant="body2" color="text.secondary">
            No models available. Configure your nRPC server above and click
            "Save & Reload Models".
          </Typography>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Box mt={2} p={2} sx={{ bgcolor: "error.dark", borderRadius: 1 }}>
          <Typography color="error.contrastText" variant="body2" gutterBottom>
            {error}
          </Typography>
          <Typography variant="body2" color="error.contrastText" gutterBottom>
            Troubleshooting checklist:
          </Typography>
          <ul
            style={{ margin: "8px 0", paddingLeft: "20px", color: "inherit" }}
          >
            <li>
              <Typography variant="body2" color="error.contrastText">
                You are logged in to nostr-polls
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="error.contrastText">
                nRPC server pubkey is correct
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="error.contrastText">
                nRPC AI server is running
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="error.contrastText">
                Ollama is installed and running on the server
              </Typography>
            </li>
          </ul>
        </Box>
      )}
    </Box>
  );
};
