import React, { useEffect } from "react";
import { Avatar, Box, Typography } from "@mui/material";
import { useAppContext } from "../../hooks/useAppContext";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";

interface OverlappingAvatarsProps {
  ids: string[];
  maxAvatars?: number;
}

const OverlappingAvatars: React.FC<OverlappingAvatarsProps> = ({
  ids,
  maxAvatars = 5,
}) => {
  let { profiles, fetchUserProfileThrottled } = useAppContext();

  useEffect(() => {
    const visibleIds = ids.slice(0, maxAvatars);
    visibleIds.forEach((id) => {
      if (!profiles?.get(id)) fetchUserProfileThrottled(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const visibleIds = ids.slice(0, maxAvatars);
  let additionalCount = ids.length - visibleIds.length;
  const excessIds = additionalCount > 0 ? additionalCount : 0;
  return (
    <Box
      sx={{
        padding: 0,
        margin: 0,
        top: 0,
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: 48 + 24 * Math.min(maxAvatars, visibleIds.length),
      }}
    >
      {visibleIds.map((id, index) => (
        <Avatar
          key={id}
          sx={{
            width: 24,
            height: 24,
            position: "absolute",
            left: `${index * 16}px`,
            zIndex: visibleIds.length - index,
            border: "1px solid #fff",
            margin: 0,
            padding: 0,
          }}
          src={profiles?.get(id)?.picture || DEFAULT_IMAGE_URL}
        />
      ))}
      {excessIds > 0 ? (
        <Avatar
          key="excess"
          sx={{
            width: 24,
            height: 24,
            position: "absolute",
            left: `${Math.min(maxAvatars, visibleIds.length) * 18}px`,
            backgroundColor: "#FAD13F",
            color: "black",
            zIndex: 0,
            fontSize: 6,
          }}
        >
          <Typography style={{ fontSize: 12 }}>+{excessIds}</Typography>
        </Avatar>
      ) : null}
    </Box>
  );
};

export default OverlappingAvatars;
