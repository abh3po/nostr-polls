import {createTheme} from "@mui/material/styles";
import {Theme} from "@mui/system/createTheme";
import {CSSObject} from "@mui/material";

export const getColorsWithTheme = (theme: Theme, styles: CSSObject, contrast: CSSObject = {}) => {
  const contrastStyles = Object.keys(styles).reduce<CSSObject>((map, key) => {
    map[key] = contrast[key] || theme.palette.getContrastText(styles[key])
    return map
  }, {})
  return {
    ...theme.applyStyles('light', styles),
    ...theme.applyStyles('dark', contrastStyles)
  }
}

const baseThemeOptions:  Parameters<typeof createTheme>[0] = {
  typography: {
    fontFamily: '"Shantell Sans", sans-serif',
  },
  colorSchemes: {
    dark: {
      palette: {
        mode: "dark",
        primary: {
          main: "#FAD13F",
        },
        secondary: {
          main: "#bdbdbc",
        },
        background: {
          default: "#f5f4f1",
        },
      },
    },
    light: {
      palette: {
        primary: {
          main: "#FAD13F",
        },
        secondary: {
          main: "#F5F4F1",
        },
        background: {
          default: "#FFFFFF",
        },
      },
    }
  },
  palette: {
    primary: {
      main: "#FAD13F",
    },
    secondary: {
      main: "#F5F4F1",
    },
    background: {
      default: "#000000",
    },
  },
  // cssVariables: true,
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => {
        return {
          body: {
              backgroundColor: theme.palette.mode === 'dark' ? '#4d4d4d' : "#f5f4f1",
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "50px",
          textTransform: "none",
        },
      },
    },
  },
}


const baseTheme = createTheme(baseThemeOptions)

export  { baseTheme};
