import React from "react";
import { Box, Tabs, Tab, useMediaQuery, useTheme } from "@mui/material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";

const feedOptions = [
  { value: "polls", label: "Polls" },
  { value: "topics", label: "Topics" },
  { value: "notes", label: "Notes" },
  { value: "movies", label: "Movies" },
];

const FeedsLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Extract feed from URL path like "/feeds/movies" -> "movies"
  const currentFeed = location.pathname.split("/")[2] || "polls";

  const handleChange = (_: any, newValue: string) => {
    navigate(`/feeds/${newValue}`);
  };

  return (
    <Box maxWidth={800} mx="auto" px={2}>
      <Tabs
        value={currentFeed}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          mb: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          "& .MuiTab-root": {
            textTransform: "none",
            minWidth: isMobile ? 80 : 120,
            fontWeight: 500,
          },
        }}
      >
        {feedOptions.map((option) => (
          <Tab key={option.value} label={option.label} value={option.value} />
        ))}
      </Tabs>

      {/* Renders the selected feed component here */}
      <Outlet />
    </Box>
  );
};

export default FeedsLayout;
