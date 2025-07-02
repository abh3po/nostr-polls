import React, { useState } from "react";
import { Container, Typography, Box, Card, Switch, FormControlLabel } from "@mui/material";
import NoteTemplateForm from "./NoteTemplateForm";
import PollTemplateForm from "./PollTemplateForm";

const EventForm = () => {
  const [isNote, setIsNote] = useState<boolean>(true);
  const [eventContent, setEventContent] = useState("");

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ mb: 1 }}
        >
          {isNote ? "Create A Note" : "Create A Poll"}
        </Typography>
      </Box>
      <Card elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            {isNote ? "Note" : "Poll"}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={!isNote}
                onChange={() => setIsNote((prev) => !prev)}
                color="primary"
              />
            }
            label={isNote ? "Switch to Poll" : "Switch to Note"}
            labelPlacement="start"
            sx={{ ml: 2 }}
          />
        </Box>
        {isNote ? (
          <NoteTemplateForm eventContent={eventContent} setEventContent={setEventContent} />
        ) : (
          <PollTemplateForm eventContent={eventContent} setEventContent={setEventContent} />
        )}
      </Card>
    </Container>
  );
};

export default EventForm;
