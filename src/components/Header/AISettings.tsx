import {
  Box,
  TextField,
  MenuItem,
  CircularProgress,
  Typography,
  Button,
  Link,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";

const LOCAL_STORAGE_KEY = "ai-settings";
const EXTENSION_LINK = "https://github.com/ashu01304/Ollama_Web";

export const AISettings: React.FC = () => {
  const { aiSettings, setAISettings } = useAppContext();

  const [localModel, setLocalModel] = useState(aiSettings.model || "");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [extensionMissing, setExtensionMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      if (!window.ollama || typeof window.ollama.getModels !== "function") {
        setExtensionMissing(true);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await window.ollama.getModels();
        if (response.success && Array.isArray(response.data.models)) {
          const models = response.data.models.map((m: any) => m.name);
          setAvailableModels(models);
        } else {
          setError(
            response.error || "⚠️ Unexpected response from Ollama extension."
          );
        }
      } catch (err) {
        setError("⚠️ Failed to communicate with the Ollama extension.");
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const handleSave = () => {
    const newSettings = { model: localModel };
    setAISettings(newSettings);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSettings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Box p={2} sx={{ bgcolor: "background.paper", color: "text.primary" }}>
      <Typography variant="h6">AI Settings</Typography>

      {extensionMissing ? (
        <Box mt={2}>
          <Typography color="error" variant="body2" gutterBottom>
            ⚠️ Ollama browser extension not found.
          </Typography>
          <Typography variant="body2" gutterBottom>
            To use AI features, please install the Ollama Web Extension:
          </Typography>
          <Link
            href={EXTENSION_LINK}
            target="_blank"
            rel="noopener"
            underline="hover"
          >
            👉 Install from GitHub
          </Link>
        </Box>
      ) : loading ? (
        <Box mt={2} display="flex" alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2" ml={1}>
            Loading models…
          </Typography>
        </Box>
      ) : availableModels.length > 0 ? (
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
      ) : (
        <Typography mt={2} variant="body2">
          No models available.
        </Typography>
      )}

      {error && (
        <Typography color="error" variant="body2" mt={1}>
          {error}
        </Typography>
      )}

      <Box mt={2} display="flex" alignItems="center" gap={2}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={extensionMissing || !localModel}
        >
          Save
        </Button>
        {saved && (
          <Typography variant="body2" color="success.main">
            ✅ Settings saved
          </Typography>
        )}
      </Box>
    </Box>
  );
};
