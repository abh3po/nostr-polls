import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { PollCreator } from "./components/PollCreator";
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
import EventList from "./components/Feed/RatingsFeed";
import { RatingProvider } from "./contexts/RatingProvider";
import RatingFeed from "./components/Feed/RatingsFeed";
import { SignerProvider } from "./contexts/signer-context";
import MoviePage from "./components/Movies/MoviePage";

declare global {
  interface Window {
    nostr?: WindowNostr;
  }
}

const App: React.FC = () => {
  return (
    <ThemeProvider theme={baseTheme} modeStorageKey={"pollerama-color-scheme"}>
      <AppContextProvider>
        <UserProvider>
          <SignerProvider>
            <ListProvider>
              <RatingProvider>
                <CssBaseline />
                <Router>
                  <Header />
                  <Routes>
                    <Route path="/create" element={<PollCreator />} />
                    <Route
                      path="/respond/:eventId"
                      element={<PollResponse />}
                    />
                    <Route path="/result/:eventId" element={<PollResults />} />
                    <Route path="/ratings" element={<EventList />} />
                    <Route path="/movies/:imdbId" element={<MoviePage />}  />
                    <Route index path="/" element={<RatingFeed />} />
                  </Routes>
                </Router>
              </RatingProvider>
            </ListProvider>
          </SignerProvider>
        </UserProvider>
      </AppContextProvider>
    </ThemeProvider>
  );
};

export default App;
