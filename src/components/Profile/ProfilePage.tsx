import React, { useCallback, useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  CircularProgress,
  Avatar,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Event, EventTemplate, nip19 } from "nostr-tools";
import { useRelays } from "../../hooks/useRelays";
import { fetchUserProfile, signEvent } from "../../nostr";
import { DEFAULT_IMAGE_URL } from "../../utils/constants";
import Rate from "../Ratings/Rate";
import UserPollsFeed from "./UserPollsFeed";
import UserNotesFeed from "./UserNotesFeed";
import UserRatingsGiven from "./UserRatingsGiven";
import { useUserContext } from "../../hooks/useUserContext";
import { useListContext } from "../../hooks/useListContext";
import { pool, nostrRuntime } from "../../singletons";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PeopleIcon from "@mui/icons-material/People";
import MailIcon from "@mui/icons-material/Mail";

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
  const [followsYou, setFollowsYou] = useState(false);
  const [showContactListWarning, setShowContactListWarning] = useState(false);
  const [pendingFollowKey, setPendingFollowKey] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const { relays } = useRelays();
  const { user, requestLogin, setUser } = useUserContext();
  const { fetchLatestContactList } = useListContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const checkIfFollowsYou = useCallback(async (profilePubkey: string) => {
    if (!user) return;

    try {
      const filter = {
        kinds: [3],
        authors: [profilePubkey],
        limit: 1,
      };

      let latestEvent: Event | null = null;

      const handle = nostrRuntime.subscribe(relays, [filter], {
        onEvent: (event: Event) => {
          // Keep track of the most recent event
          if (!latestEvent || event.created_at > latestEvent.created_at) {
            latestEvent = event;
          }
        },
      });

      // Wait for responses, then check the latest event
      setTimeout(() => {
        handle.unsubscribe();
        if (latestEvent) {
          const follows = latestEvent.tags
            .filter((tag) => tag[0] === "p")
            .map((tag) => tag[1]);

          if (follows.includes(user.pubkey)) {
            setFollowsYou(true);
          }
        }
      }, 2000);
    } catch (err) {
      console.error("Error checking if follows you:", err);
    }
  }, [user, relays]);

  const fetchFollowerStats = useCallback(async (profilePubkey: string) => {
    setLoadingFollowers(true);

    try {
      // Fetch who this profile follows (their contact list)
      const followingFilter = {
        kinds: [3],
        authors: [profilePubkey],
        limit: 1,
      };

      let followingEvent: Event | null = null;
      const followingHandle = nostrRuntime.subscribe(relays, [followingFilter], {
        onEvent: (event: Event) => {
          if (!followingEvent || event.created_at > followingEvent.created_at) {
            followingEvent = event;
          }
        },
      });

      // Fetch who follows this profile (search for contact lists that include this pubkey)
      const followersFilter = {
        kinds: [3],
        "#p": [profilePubkey],
        limit: 500,
      };

      const followers = new Set<string>();
      const followersHandle = nostrRuntime.subscribe(relays, [followersFilter], {
        onEvent: (event: Event) => {
          followers.add(event.pubkey);
        },
      });

      // Wait for responses
      setTimeout(() => {
        followingHandle.unsubscribe();
        followersHandle.unsubscribe();

        // Count following
        if (followingEvent) {
          const followingList = followingEvent.tags.filter((tag) => tag[0] === "p");
          setFollowingCount(followingList.length);
        } else {
          setFollowingCount(0);
        }

        // Count followers
        setFollowerCount(followers.size);
        setLoadingFollowers(false);
      }, 3000);
    } catch (err) {
      console.error("Error fetching follower stats:", err);
      setLoadingFollowers(false);
    }
  }, [relays]);

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
        setFollowerCount(null);
        setFollowingCount(null);
        setFollowsYou(false);

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

        // Check if this profile follows the current user
        if (user) {
          checkIfFollowsYou(extractedPubkey);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading profile:", err);
        setError(err instanceof Error ? err.message : "Failed to load profile");
        setLoading(false);
      }
    };

    loadProfile();
  }, [npubOrNprofile, relays, user, checkIfFollowsYou]);

  const addToContacts = async () => {
    if (!user) {
      requestLogin();
      return;
    }

    if (!pubkey) return;

    const contactEvent = await fetchLatestContactList();

    if (!contactEvent) {
      setPendingFollowKey(pubkey);
      setShowContactListWarning(true);
      return;
    }

    await updateContactList(contactEvent, pubkey);
  };

  const updateContactList = async (
    contactEvent: Event | null,
    pubkeyToAdd: string
  ) => {
    const existingTags = contactEvent?.tags || [];
    const pTags = existingTags.filter(([t]) => t === "p").map(([, pk]) => pk);

    if (pTags.includes(pubkeyToAdd)) return;

    const updatedTags = [...existingTags, ["p", pubkeyToAdd]];

    const newEvent: EventTemplate = {
      kind: 3,
      created_at: Math.floor(Date.now() / 1000),
      tags: updatedTags,
      content: contactEvent?.content || "",
    };

    const signed = await signEvent(newEvent);
    pool.publish(relays, signed);
    setUser({
      pubkey: signed.pubkey,
      ...user,
      follows: [...pTags, pubkeyToAdd],
    });
  };

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
    <Box
      ref={scrollContainerRef}
      maxWidth={800}
      mx="auto"
      sx={{
        px: 2,
        py: { xs: 2, sm: 4 },
        height: "100vh",
        overflowY: "auto",
      }}
    >
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
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  justifyContent: { xs: "center", sm: "flex-start" },
                  mb: 1,
                }}
              >
                <Typography variant="h5">
                  {profile?.name || profile?.username || "Unnamed"}
                </Typography>
                {user && user.pubkey !== pubkey && (
                  <>
                    {user.follows?.includes(pubkey) ? (
                      <Chip
                        label="Following"
                        icon={<CheckCircleIcon />}
                        color="primary"
                        size="small"
                      />
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={addToContacts}
                      >
                        {followsYou ? "Follow Back" : "Follow"}
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<MailIcon />}
                      onClick={() =>
                        navigate(`/messages/${nip19.npubEncode(pubkey)}`)
                      }
                    >
                      Message
                    </Button>
                  </>
                )}
              </Box>
              {followsYou && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 1, display: "block" }}
                >
                  Follows you
                </Typography>
              )}
              {/* Follower/Following Stats */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  mb: 1,
                  justifyContent: { xs: "center", sm: "flex-start" },
                }}
              >
                {followerCount !== null && followingCount !== null ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      <strong>{followerCount}</strong> followers
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>{followingCount}</strong> following
                    </Typography>
                  </>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={loadingFollowers ? <CircularProgress size={16} /> : <PeopleIcon />}
                    onClick={() => pubkey && fetchFollowerStats(pubkey)}
                    disabled={loadingFollowers}
                  >
                    {loadingFollowers ? "Loading..." : "Load followers"}
                  </Button>
                )}
              </Box>
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
        <UserPollsFeed pubkey={pubkey} scrollContainerRef={scrollContainerRef} />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <UserNotesFeed pubkey={pubkey} scrollContainerRef={scrollContainerRef} />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <UserRatingsGiven pubkey={pubkey} scrollContainerRef={scrollContainerRef} />
      </TabPanel>

      <Dialog
        open={showContactListWarning}
        onClose={() => setShowContactListWarning(false)}
      >
        <DialogTitle>Warning</DialogTitle>
        <DialogContent>
          <Typography>
            We couldn't find your existing contact list. If you continue, your
            follow list will only contain this person.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowContactListWarning(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (pendingFollowKey) {
                updateContactList(null, pendingFollowKey);
              }
              setShowContactListWarning(false);
              setPendingFollowKey(null);
            }}
            color="primary"
            variant="contained"
          >
            Continue Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
