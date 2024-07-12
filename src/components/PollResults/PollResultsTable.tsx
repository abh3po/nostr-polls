// PollResults.tsx
import React from 'react';
import { Typography, Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material';
import { Event } from "nostr-tools/lib/types/core";
import { Analytics } from './Analytics';

interface PollResultsProps {
  pollEvent: Event
  events: Event[]; // Replace with actual event data structure
}

const PollResults: React.FC<PollResultsProps> = ({ pollEvent, events }) => {
  const label = pollEvent.tags.find((t) => t[0] === "label")?.[1]
  const options = pollEvent.tags.filter((t) => t[0] === "option")


  const getResponseIds = (responses: string[][]) => {
    let responseIds = responses.map((r) => r[1])
    let responseIdSet = new Set(responseIds)
    return Array.from(responseIdSet)
  }

  const getOptionLabel = (optionId: string) => {
    return options.find(option => option[1] === optionId)?.[2];
  }
  return (
    <div className="poll-results">
      <Typography variant="h5" gutterBottom>Poll Results</Typography>

      {/* Raw Data Table */}
      <Typography variant="h6" gutterBottom>Raw Data</Typography>
      <TableContainer component={Paper}>
        <Table aria-label="poll results table">
          <TableHead>
            <TableRow>
              <TableCell>Question</TableCell>
              <TableCell>Response</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event, index) => {
              let responses = event.tags.filter((t) => t[0] === "response")
              let responseIds = getResponseIds(responses);
              return (
                <TableRow key={index}>
                  <TableCell>{label}</TableCell>
                  <TableCell>{responseIds.map((r) => getOptionLabel(r)).join(", ")}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Analytics pollEvent={pollEvent} responses={events} />
    </div>
  );
};

export default PollResults;
