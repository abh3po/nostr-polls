import React from "react";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { styled } from "@mui/system";
import logo from "../../Images/logo.svg";
import { UserMenu } from "./UserMenu";
import { useNavigate } from "react-router-dom";
import { getColorsWithTheme } from "../../styles/theme";

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
          <Button variant="contained" onClick={() => navigate("/create")}>
            <Typography>Create</Typography>
          </Button>
          <UserMenu />
        </HeaderRightSection>
      </Toolbar>
    </StyledAppBar>
  );
};

export default Header;
