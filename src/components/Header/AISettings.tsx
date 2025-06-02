import {
  Box,
  TextField,
  MenuItem,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";

const LOCAL_STORAGE_KEY = "ai-settings";

export const AISettings: React.FC = () => {
  const { aiSettings, setAISettings } = useAppContext();

  const [endpoint, setEndpoint] = useState(aiSettings.endpoint || "");
  const [model, setModel] = useState(aiSettings.model || "");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-save settings
  useEffect(() => {
    const newSettings = { endpoint, model };
    setAISettings(newSettings);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSettings));
  }, [endpoint, model, setAISettings]);

  // Fetch models whenever endpoint is a full URL
  useEffect(() => {
    const fetchModels = async () => {
      if (!endpoint.startsWith("http")) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${endpoint}/v1/models`);
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          const models = data.data.map((m: any) => m.id);
          setAvailableModels(models);
        } else {
          throw new Error("Invalid model response");
        }
      } catch (err) {
        setError("⚠️ Failed to fetch models");
        setAvailableModels([]);
      }
      setLoading(false);
    };

    fetchModels();
  }, [endpoint]);

  return (
    <Box p={2} sx={{ bgcolor: "background.paper", color: "text.primary" }}>
      <Typography variant="h6">AI Settings</Typography>

      <TextField
        label="AI Endpoint"
        fullWidth
        value={endpoint}
        onChange={(e) => setEndpoint(e.target.value)}
        margin="normal"
      />

      {loading ? (
        <Box mt={2}>
          <CircularProgress size={20} />
          <Typography variant="body2" ml={1} display="inline">
            Fetching models…
          </Typography>
        </Box>
      ) : (
        availableModels.length > 0 && (
          <TextField
            select
            label="Select Model"
            fullWidth
            value={model}
            onChange={(e) => setModel(e.target.value)}
            margin="normal"
          >
            {availableModels.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
        )
      )}

      {error && (
        <Typography color="error" variant="body2" mt={1}>
          {error}
        </Typography>
      )}
    </Box>
  );
};
