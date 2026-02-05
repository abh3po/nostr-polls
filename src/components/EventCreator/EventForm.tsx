import React, { useState } from "react";
import { Container, Box, Card, Tabs, Tab } from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import PollIcon from "@mui/icons-material/Poll";
import NoteTemplateForm from "./NoteTemplateForm";
import PollTemplateForm from "./PollTemplateForm";

const EventForm = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [eventContent, setEventContent] = useState("");

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Card elevation={2} sx={{ p: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={tabIndex}
            onChange={(_, newValue) => setTabIndex(newValue)}
            variant="fullWidth"
          >
            <Tab icon={<EditNoteIcon />} label="Note" iconPosition="start" />
            <Tab icon={<PollIcon />} label="Poll" iconPosition="start" />
          </Tabs>
        </Box>
        {tabIndex === 0 ? (
          <NoteTemplateForm eventContent={eventContent} setEventContent={setEventContent} />
        ) : (
          <PollTemplateForm eventContent={eventContent} setEventContent={setEventContent} />
        )}
      </Card>
    </Container>
  );
};

export default EventForm;
