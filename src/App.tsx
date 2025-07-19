import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Outlet,
  Navigate,
} from "react-router-dom";
import { EventCreator } from "./components/EventCreator";
import { PollResponse } from "./components/PollResponse";
import { PollResults } from "./components/PollResults";
import type { WindowNostr } from "nostr-tools/lib/types/nip07";
import { AppContextProvider } from "./contexts/app-context";
import Header from "./components/Header";
import { ListProvider } from "./contexts/lists-context";
import { UserProvider } from "./contexts/user-context";
import CssBaseline from "@mui/material/CssBaseline";
import { baseTheme } from "./styles/theme";
import { ThemeProvider } from "@mui/material";
import EventList from "./components/Feed/FeedsLayout";
import { RatingProvider } from "./contexts/RatingProvider";
import { SignerProvider } from "./contexts/signer-context";
import MoviePage from "./components/Movies/MoviePage";
import NotesFeed from "./components/Feed/NotesFeed/components";
import ProfilesFeed from "./components/Feed/ProfileFeed";
import HashtagsFeed from "./components/Feed/HashtagsFeed";
import { PollFeed } from "./components/Feed/PollFeed";
import MoviesFeed from "./components/Feed/MoviesFeed";
import { MovieMetadataProvider } from "./components/Movies/context/MovieMetadataProvider";
import FeedsLayout from "./components/Feed/FeedsLayout";
import { NotificationProvider } from "./contexts/notification-context";
import { RelayProvider } from "./contexts/relay-context";

declare global {
  interface Window {
    nostr?: WindowNostr;
  }
}

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <ThemeProvider theme={baseTheme} modeStorageKey={"pollerama-color-scheme"}>
        <AppContextProvider>
        <UserProvider>
          <SignerProvider>
            <RelayProvider>
              <ListProvider>
                <RatingProvider>
                <CssBaseline />
                <Router>
                  <Header />
                  <Routes>
                    <Route path="/create" element={<EventCreator />} />
                    <Route
                      path="/respond/:eventId"
                      element={<PollResponse />}
                    />
                    <Route path="/result/:eventId" element={<PollResults />} />
                    <Route path="/ratings" element={<EventList />} />
                    <Route path="/feeds" element={<FeedsLayout />}>
                      <Route path="notes" element={<NotesFeed />} />
                      <Route path="profiles" element={<ProfilesFeed />} />
                      <Route path="hashtags" element={<HashtagsFeed />} />
                      <Route path="polls" index={true} element={<PollFeed />} />

                      {/* Wrap the movies routes inside MovieMetadataProvider */}
                      <Route
                        element={
                          <MovieMetadataProvider>
                            <Outlet />
                          </MovieMetadataProvider>
                        }
                      >
                        <Route path="movies" element={<MoviesFeed />} />
                        <Route path="movies/:imdbId" element={<MoviePage />} />
                      </Route>

                      {/* default route inside feeds */}
                      <Route index element={<PollFeed />} />
                    </Route>
                    <Route
                      index
                      path="/"
                      element={<Navigate to="/feeds/polls" replace />}
                    />
                  </Routes>
                </Router>
              </RatingProvider>
              </ListProvider>
            </RelayProvider>
          </SignerProvider>
        </UserProvider>
      </AppContextProvider>
    </ThemeProvider>
    </NotificationProvider>
  );
};

export default App;
