import {
  Box,
  TextField,
  MenuItem,
  CircularProgress,
  Typography,
  Button,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useAppContext } from "../../hooks/useAppContext";

const LOCAL_STORAGE_KEY = "ai-settings";

export const AISettings: React.FC = () => {
  const { aiSettings, setAISettings } = useAppContext();

  const [localEndpoint, setLocalEndpoint] = useState(aiSettings.endpoint || "");
  const [localModel, setLocalModel] = useState(aiSettings.model || "");

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load models when endpoint changes
  useEffect(() => {
    const fetchModels = async () => {
      if (!localEndpoint.startsWith("http")) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${localEndpoint}/v1/models`);
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          const models = data.data.map((m: any) => m.id);
          setAvailableModels(models);
          setError(null);
        } else {
          throw new Error("Invalid model response");
        }
      } catch (err) {
        setError("⚠️ Failed to fetch models");
        setAvailableModels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [localEndpoint]);

  const handleSave = () => {
    const newSettings = { endpoint: localEndpoint, model: localModel };
    setAISettings(newSettings);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSettings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000); // feedback disappears after 2 sec
  };

  return (
    <Box p={2} sx={{ bgcolor: "background.paper", color: "text.primary" }}>
      <Typography variant="h6">AI Settings</Typography>

      <TextField
        label="AI Endpoint"
        fullWidth
        value={localEndpoint}
        onChange={(e) => {
          setLocalEndpoint(e.target.value);
          setSaved(false);
        }}
        margin="normal"
      />

      {loading ? (
        <Box mt={2} display="flex" alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2" ml={1}>
            Fetching models…
          </Typography>
        </Box>
      ) : (
        availableModels.length > 0 && (
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
        )
      )}

      {error && (
        <Typography color="error" variant="body2" mt={1}>
          {error}
        </Typography>
      )}

      <Box mt={2} display="flex" alignItems="center" gap={2}>
        <Button variant="contained" onClick={handleSave}>
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
