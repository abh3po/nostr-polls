import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from "@mui/material";
import { Event } from "nostr-tools/lib/types/core";
import { useEffect } from "react";
import { useAppContext } from "../../hooks/useAppContext";
import OverlappingAvatars from "../Common/OverlappingAvatars";
import { TextWithImages } from "../Common/Parsers/TextWithImages";

interface AnalyticsProps {
  pollEvent: Event;
  responses: Event[];
}

export const Analytics: React.FC<AnalyticsProps> = ({
  pollEvent,
  responses,
}) => {
  const label =
    pollEvent.tags.find((t) => t[0] === "label")?.[1] || pollEvent.content;
  const options = pollEvent.tags.filter((t) => t[0] === "option");

  const { profiles, fetchUserProfileThrottled } = useAppContext();

  useEffect(() => {
    responses.forEach((event) => {
      const responderId = event.pubkey;
      if (!profiles?.get(responderId)) {
        fetchUserProfileThrottled(responderId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateResults = () => {
    const results: { count: number; responders: Set<string> }[] = options.map(
      () => ({ count: 0, responders: new Set<string>() })
    );
    // Count responses from events
    responses.forEach((event) => {
      const responderId = event.pubkey; // Assuming event.pubkey holds the user ID
      event.tags.forEach((tag: string[]) => {
        if (tag[0] === "response") {
          const optionId = tag[1];
          const responseIndex = options.findIndex(
            (optionTag) => optionTag[1] === optionId
          );
          if (responseIndex !== -1) {
            if (!results[responseIndex].responders.has(responderId)) {
              results[responseIndex].count++;
              results[responseIndex].responders.add(responderId);
            }
          }
        }
      });
    });
    return results;
  };
  const results = calculateResults();

  const calculatePercentages = (counts: number[]) => {
    const total = counts.reduce((acc, count) => acc + count, 0);
    if (total === 0) {
      return counts.map(() => "0.00");
    }
    return counts.map((count) => ((count / total) * 100).toFixed(2));
  };

  return (
    <>
      {/* <Typography variant="subtitle1" gutterBottom>{label}</Typography> */}
      <TableContainer component={Paper}>
        <Table aria-label={`Results for "${label}"`}>
          <TableBody>
            {options.map((option, index) => {
              const responders = Array.from(results[index].responders);
              return (
                <TableRow key={index}>
                  <TableCell>
                    {<TextWithImages content={option[2]} />}
                  </TableCell>
                  <TableCell>
                    {calculatePercentages(results.map((r) => r.count))[index]}%
                  </TableCell>
                  <TableCell>
                    <OverlappingAvatars ids={responders} maxAvatars={2} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
