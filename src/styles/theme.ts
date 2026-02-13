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
          main: "#DAA520", // Goldenrod - easier on eyes than bright yellow
        },
        secondary: {
          main: "#bdbdbc", // Grey - same as dark mode for consistency
        },
        background: {
          default: "#FFFFFF",
        },
      },
    }
  },
  palette: {
    primary: {
      main: "#DAA520", // Goldenrod for light mode compatibility
    },
    secondary: {
      main: "#bdbdbc", // Grey for consistency
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
        text: ({ theme }) => ({
          // Text buttons: black with yellow shadow in light mode
          color: theme.palette.mode === 'dark' ? theme.palette.primary.main : '#000000',
          textShadow: theme.palette.mode === 'dark' ? 'none' : '0 0 8px rgba(218, 165, 32, 0.3)',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(250, 209, 63, 0.08)' : 'rgba(218, 165, 32, 0.08)',
            textShadow: theme.palette.mode === 'dark' ? 'none' : '0 0 12px rgba(218, 165, 32, 0.5)',
          },
        }),
        outlined: ({ theme }) => ({
          // Outlined buttons: black with yellow shadow in light mode
          color: theme.palette.mode === 'dark' ? theme.palette.primary.main : '#000000',
          borderColor: theme.palette.mode === 'dark' ? theme.palette.primary.main : '#000000',
          textShadow: theme.palette.mode === 'dark' ? 'none' : '0 0 8px rgba(218, 165, 32, 0.3)',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(250, 209, 63, 0.08)' : 'rgba(218, 165, 32, 0.08)',
            borderColor: theme.palette.mode === 'dark' ? theme.palette.primary.main : '#000000',
            textShadow: theme.palette.mode === 'dark' ? 'none' : '0 0 12px rgba(218, 165, 32, 0.5)',
          },
        }),
      },
    },
    MuiModal: {
      styleOverrides: {
        root: {
          // Ensures modal takes full height and scrolls when needed
          overflowY: "auto",
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          overflow: "hidden",
          // Prevent text from overflowing when image fails to load
          "& > *:not(img)": {
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        fallback: {
          // Ensure fallback icon stays within bounds
          width: "75%",
          height: "75%",
        },
      },
    },
  },
}


const baseTheme = createTheme(baseThemeOptions)

export  { baseTheme};
