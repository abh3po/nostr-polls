import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Outlet,
  Navigate,
} from "react-router-dom";
import type { WindowNostr } from "nostr-tools/lib/types/nip07";
import { AppContextProvider } from "./contexts/app-context";
import Header from "./components/Header";
import { ListProvider } from "./contexts/lists-context";
import { UserProvider } from "./contexts/user-context";
import CssBaseline from "@mui/material/CssBaseline";
import { baseTheme } from "./styles/theme";
import { CircularProgress, ThemeProvider } from "@mui/material";
import { RatingProvider } from "./contexts/RatingProvider";
import { SignerProvider } from "./contexts/signer-context";
import { MovieMetadataProvider } from "./components/Movies/context/MovieMetadataProvider";
import FeedsLayout from "./components/Feed/FeedsLayout";
import { NotificationProvider } from "./contexts/notification-context";

const EventCreator = lazy(() => import("./components/EventCreator"));
const PollResponse = lazy(() => import("./components/PollResponse"));
const PollResults = lazy(() => import("./components/PollResults"));
const MoviePage = lazy(() => import("./components/Movies/MoviePage"));
const NotesFeed = lazy(() => import("./components/Feed/NotesFeed/components"));
const ProfilesFeed = lazy(() => import("./components/Feed/ProfileFeed"));
const HashtagsFeed = lazy(() => import("./components/Feed/HashtagsFeed"));
const PollFeed = lazy(() => import("./components/Feed/PollFeed"));
const MoviesFeed = lazy(() => import("./components/Feed/MoviesFeed"));

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
              <ListProvider>
                <RatingProvider>
                  <CssBaseline />
                  <Router>
                    <Header />
                    <Suspense fallback={<CircularProgress />}>
                      <Routes>
                        <Route path="/create" element={<EventCreator />} />
                        <Route
                          path="/respond/:eventId"
                          element={<PollResponse />}
                        />
                        <Route path="/result/:eventId" element={<PollResults />} />
                        <Route path="/ratings" element={<FeedsLayout />} />
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
                    </Suspense>
                  </Router>
                </RatingProvider>
              </ListProvider>
            </SignerProvider>
          </UserProvider>
        </AppContextProvider>
      </ThemeProvider>
    </NotificationProvider>
  );
};

export default App;
