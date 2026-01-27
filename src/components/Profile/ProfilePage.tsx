import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Box,
  CircularProgress,
  Avatar,
  Card,
  CardContent,
  Tabs,
  Tab,
} from "@mui/material";
import { nip19 } from "nostr-tools";
import { useRelays } from "../../hooks/useRelays";
import { fetchUserProfile } from "../../nostr";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import Rate from "../Ratings/Rate";
import UserPollsFeed from "./UserPollsFeed";
import UserNotesFeed from "./UserNotesFeed";
import UserRatingsGiven from "./UserRatingsGiven";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const ProfilePage: React.FC = () => {
  const { npubOrNprofile } = useParams<{ npubOrNprofile: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);
  const { relays } = useRelays();

  useEffect(() => {
    const loadProfile = async () => {
      if (!npubOrNprofile) {
        setError("No profile identifier provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Decode npub or nprofile to get pubkey
        const decoded = nip19.decode(npubOrNprofile);
        let extractedPubkey: string;

        if (decoded.type === "npub") {
          extractedPubkey = decoded.data;
        } else if (decoded.type === "nprofile") {
          extractedPubkey = decoded.data.pubkey;
        } else {
          throw new Error("Invalid profile identifier. Must be npub or nprofile.");
        }

        setPubkey(extractedPubkey);

        // Fetch profile metadata
        const profileEvent = await fetchUserProfile(extractedPubkey, relays);
        if (profileEvent) {
          const profileData = JSON.parse(profileEvent.content || "{}");
          setProfile(profileData);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading profile:", err);
        setError(err instanceof Error ? err.message : "Failed to load profile");
        setLoading(false);
      }
    };

    loadProfile();
  }, [npubOrNprofile, relays]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !pubkey) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" variant="h6">
          {error || "Failed to load profile"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      {/* Profile Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "center", sm: "flex-start" },
              gap: 2,
            }}
          >
            <Avatar
              src={profile?.picture || DEFAULT_IMAGE_URL}
              alt={profile?.name || "Profile"}
              sx={{ width: 80, height: 80 }}
            />
            <Box sx={{ flex: 1, textAlign: { xs: "center", sm: "left" } }}>
              <Typography variant="h5" gutterBottom>
                {profile?.name || profile?.username || "Unnamed"}
              </Typography>
              {profile?.nip05 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {profile.nip05}
                </Typography>
              )}
              {profile?.about && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {profile.about}
                </Typography>
              )}
              <Rate entityId={pubkey} entityType="profile" />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="profile tabs"
          variant="fullWidth"
        >
          <Tab label="Polls" />
          <Tab label="Notes" />
          <Tab label="Ratings" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <TabPanel value={tabValue} index={0}>
        <UserPollsFeed pubkey={pubkey} />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <UserNotesFeed pubkey={pubkey} />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <UserRatingsGiven pubkey={pubkey} />
      </TabPanel>
    </Box>
  );
};

export default ProfilePage;
