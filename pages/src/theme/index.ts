import { createTheme } from '@mui/material/styles';

// 浅色主题配置
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#F5F5F5',
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 15,
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: '15px',
          margin: '8px 24px 8px 8px',
          border: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: '15px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '15px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '8px',
          '&:last-child': {
            paddingBottom: '8px',
          },
        },
      },
    },
  },
});

// 深色主题配置
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
    },
    secondary: {
      main: '#f48fb1',
      light: '#f8bbd9',
      dark: '#f06292',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  shape: {
    borderRadius: 15,
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: '15px',
          margin: '8px 24px 8px 8px',
          border: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: '15px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '15px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '8px',
          '&:last-child': {
            paddingBottom: '8px',
          },
        },
      },
    },
  },
});

// 主题类型
export type ThemeMode = 'light' | 'dark';