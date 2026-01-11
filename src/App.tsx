// App.tsx
import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Outlet,
  Navigate,
  useParams,
} from "react-router-dom";

import { StatusBar, Style } from "@capacitor/status-bar";

import { EventCreator } from "./components/EventCreator";
import { PollResponse } from "./components/PollResponse";
import { PollResults } from "./components/PollResults";
import Header from "./components/Header";
import { PrepareNote } from "./components/Notes/PrepareNote";

import { AppContextProvider } from "./contexts/app-context";
import { ListProvider } from "./contexts/lists-context";
import { UserProvider } from "./contexts/user-context";
import { RatingProvider } from "./contexts/RatingProvider";
import { MetadataProvider } from "./hooks/MetadataProvider";
import { NotificationProvider } from "./contexts/notification-context";
import { RelayProvider } from "./contexts/relay-context";
import { NostrNotificationsProvider } from "./contexts/nostr-notification-context";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material";
import { baseTheme } from "./styles/theme";

import EventList from "./components/Feed/FeedsLayout";
import NotesFeed from "./components/Feed/NotesFeed/components";
import ProfilesFeed from "./components/Feed/ProfileFeed";
import { PollFeed } from "./components/Feed/PollFeed";
import MoviesFeed from "./components/Feed/MoviesFeed";
import MoviePage from "./components/Movies/MoviePage";
import TopicsFeed from "./components/Feed/TopicsFeed";
import TopicExplorer from "./components/Feed/TopicsFeed/TopicsExplorerFeed";
import FeedsLayout from "./components/Feed/FeedsLayout";

declare global {
  interface Window {
    nostr?: any;
  }
}

const App: React.FC = () => {
  // ⚡ Capacitor status bar setup
  useEffect(() => {
    const setupStatusBar = async () => {
      try {
        // Make sure the content starts below the status bar
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch (e) {
        console.warn("StatusBar plugin error:", e);
      }
    };

    setupStatusBar();
  }, []);

  return (
    <NotificationProvider>
      <ThemeProvider
        theme={baseTheme}
        modeStorageKey={"pollerama-color-scheme"}
      >
        <AppContextProvider>
          <UserProvider>
            <RelayProvider>
              <NostrNotificationsProvider>
                <ListProvider>
                  <RatingProvider>
                    <CssBaseline />
                    <MetadataProvider>
                      <Router>
                        {/* ✅ Safe-area header wrapper */}
                        <div className="header-safe-area">
                          <Header />
                        </div>

                        <Routes>
                          <Route path="/create" element={<EventCreator />} />
                          <Route
                            path="/respond/:eventId"
                            element={<PollResponse />}
                          />
                          <Route
                            path="note/:eventId"
                            element={<PrepareNoteWrapper />}
                          />
                          <Route
                            path="/result/:eventId"
                            element={<PollResults />}
                          />
                          <Route path="/ratings" element={<EventList />} />

                          <Route path="/feeds" element={<FeedsLayout />}>
                            <Route path="notes" element={<NotesFeed />} />
                            <Route path="profiles" element={<ProfilesFeed />} />
                            <Route path="topics" element={<TopicsFeed />}>
                              <Route path=":tag" element={<TopicExplorer />} />
                            </Route>
                            <Route path="polls" index element={<PollFeed />} />

                            <Route element={<Outlet />}>
                              <Route path="movies" element={<MoviesFeed />} />
                              <Route
                                path="movies/:imdbId"
                                element={<MoviePage />}
                              />
                            </Route>

                            <Route index element={<PollFeed />} />
                          </Route>

                          <Route
                            index
                            path="/"
                            element={<Navigate to="/feeds/polls" replace />}
                          />
                        </Routes>
                      </Router>
                    </MetadataProvider>
                  </RatingProvider>
                </ListProvider>
              </NostrNotificationsProvider>
            </RelayProvider>
          </UserProvider>
        </AppContextProvider>
      </ThemeProvider>
    </NotificationProvider>
  );
};

// Wrapper to pass eventId to PrepareNote
function PrepareNoteWrapper() {
  const { eventId } = useParams();
  if (!eventId) return null;
  return <PrepareNote neventId={eventId} />;
}

export default App;
