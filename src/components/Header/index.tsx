import React from "react";
import { AppBar, Toolbar, Typography, Button, IconButton, Badge } from "@mui/material";
import { styled } from "@mui/system";
import MailIcon from "@mui/icons-material/Mail";
import logo from "../../Images/logo.svg";
import { UserMenu } from "./UserMenu";
import { useNavigate } from "react-router-dom";
import { getColorsWithTheme } from "../../styles/theme";
import { NotificationBell } from "./NotificationBell";
import { useDMContext } from "../../hooks/useDMContext";

const StyledAppBar = styled(AppBar)(({ theme }) => {
  return {
    backgroundColor: theme.palette.mode === "dark" ? "#000000" : "#ffffff",
  };
});

const StyledButton = styled(Button)(({ theme }) => ({
  ...getColorsWithTheme(theme, {
    color: "#000000",
  }),
}));

const HeaderCenterSection = styled("div")({
  flexGrow: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
});

const HeaderRightSection = styled("div")({
  marginLeft: "auto",
  display: "flex",
});

const LogoAndTitle = styled("div")({
  display: "flex",
  alignItems: "center",
});

const Header: React.FC = () => {
  let navigate = useNavigate();
  const { unreadTotal } = useDMContext();

  return (
    <StyledAppBar position="static">
      <Toolbar>
        <HeaderCenterSection>
          <LogoAndTitle>
            <StyledButton onClick={() => navigate("/")} variant="text">
              <img src={logo} alt="Logo" height={32} width={32} />
              <Typography variant="h6">Pollerama</Typography>
            </StyledButton>
          </LogoAndTitle>
        </HeaderCenterSection>
        <HeaderRightSection>
          <NotificationBell />
          <IconButton color="inherit" onClick={() => navigate("/messages")} sx={{ mr: 1 }}>
            <Badge badgeContent={unreadTotal} color="primary" invisible={unreadTotal === 0}>
              <MailIcon />
            </Badge>
          </IconButton>
          <UserMenu />
        </HeaderRightSection>
      </Toolbar>
    </StyledAppBar>
  );
};

export default Header;
