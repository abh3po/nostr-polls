import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Alert,
  Stack,
  Divider,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";

interface Typo {
  original: string;
  correction: string;
  position: number;
}

interface EnhancementSuggestions {
  typos: Typo[];
  hashtags: string[];
  correctedText: string;
}

interface PostEnhancementDialogProps {
  open: boolean;
  onClose: () => void;
  suggestions: EnhancementSuggestions | null;
  originalText: string;
  onApply: (newText: string, hashtags: string[]) => void;
}

export const PostEnhancementDialog: React.FC<PostEnhancementDialogProps> = ({
  open,
  onClose,
  suggestions,
  originalText,
  onApply,
}) => {
  const [selectedHashtags, setSelectedHashtags] = useState<Set<string>>(
    new Set()
  );
  const [applyCorrections, setApplyCorrections] = useState(true);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open && suggestions) {
      setSelectedHashtags(new Set()); // Start with no hashtags selected
      setApplyCorrections(suggestions.typos.length > 0);
    }
  }, [open, suggestions]);

  if (!suggestions) return null;

  const toggleHashtag = (hashtag: string) => {
    const newSet = new Set(selectedHashtags);
    if (newSet.has(hashtag)) {
      newSet.delete(hashtag);
    } else {
      newSet.add(hashtag);
    }
    setSelectedHashtags(newSet);
  };

  const handleApply = () => {
    const baseText = applyCorrections
      ? suggestions.correctedText
      : originalText;

    // Add selected hashtags at the end if they're not already in the text
    const hashtagsToAdd = Array.from(selectedHashtags).filter(
      (tag) => !baseText.toLowerCase().includes(`#${tag.toLowerCase()}`)
    );

    const finalText =
      hashtagsToAdd.length > 0
        ? `${baseText}\n\n${hashtagsToAdd.map((t) => `#${t}`).join(" ")}`
        : baseText;

    onApply(finalText, Array.from(selectedHashtags));
    onClose();
  };

  const hasTypos = suggestions.typos.length > 0;
  const hasHashtags = suggestions.hashtags.length > 0;
  const hasSelections = applyCorrections || selectedHashtags.size > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          overscrollBehavior: "contain",
          touchAction: "pan-y",
        },
        onWheel: (e: React.WheelEvent) => e.stopPropagation(),
        onTouchMove: (e: React.TouchEvent) => e.stopPropagation(),
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AutoFixHighIcon color="primary" />
          <Typography variant="h6">Proofreading Suggestions</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {!hasTypos && !hasHashtags && (
            <Alert severity="success">
              No corrections or hashtag suggestions. Your post looks great! ✨
            </Alert>
          )}

          {!hasTypos && hasHashtags && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No corrections needed! Here are some hashtag suggestions to boost discoverability:
            </Alert>
          )}

          {/* Spelling & Grammar Corrections */}
          {hasTypos && (
            <Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={1}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  Spelling & Grammar ({suggestions.typos.length})
                </Typography>
                <Button
                  size="small"
                  variant={applyCorrections ? "contained" : "outlined"}
                  onClick={() => setApplyCorrections(!applyCorrections)}
                  startIcon={applyCorrections ? <CheckIcon /> : <CloseIcon />}
                >
                  {applyCorrections ? "Applied" : "Skipped"}
                </Button>
              </Box>
              <List dense>
                {suggestions.typos.map((typo, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      bgcolor: "action.hover",
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            component="span"
                            sx={{ textDecoration: "line-through", color: "error.main" }}
                          >
                            {typo.original}
                          </Typography>
                          <Typography component="span">→</Typography>
                          <Typography
                            component="span"
                            sx={{ color: "success.main", fontWeight: "bold" }}
                          >
                            {typo.correction}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {hasTypos && hasHashtags && <Divider />}

          {/* Hashtag Suggestions */}
          {hasHashtags && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                Suggested Hashtags
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Click to select hashtags you want to add
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {suggestions.hashtags.map((hashtag) => {
                  const isSelected = selectedHashtags.has(hashtag);
                  return (
                    <Chip
                      key={hashtag}
                      label={`#${hashtag}`}
                      onClick={() => toggleHashtag(hashtag)}
                      color={isSelected ? "primary" : "default"}
                      variant={isSelected ? "filled" : "outlined"}
                      icon={isSelected ? <CheckIcon /> : undefined}
                      sx={{ cursor: "pointer" }}
                    />
                  );
                })}
              </Stack>
              {selectedHashtags.size > 0 && (
                <Typography variant="caption" color="text.secondary" mt={1} display="block">
                  {selectedHashtags.size} hashtag{selectedHashtags.size !== 1 ? 's' : ''} selected
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={!hasSelections}
          startIcon={<AutoFixHighIcon />}
        >
          {selectedHashtags.size > 0 && !applyCorrections
            ? `Add ${selectedHashtags.size} Hashtag${selectedHashtags.size !== 1 ? 's' : ''}`
            : 'Apply Suggestions'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
