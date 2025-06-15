// itsm_frontend/src/pages/HomePage.tsx
import { useState, useEffect } from 'react';
import {
  AppBar as MuiAppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  CssBaseline,
  useTheme,
  Button,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  // InputLabel, // Removed as it's not used
} from '@mui/material';
import type { Theme } from '@mui/material';
import { css } from '@emotion/react';
import MenuIcon from '@mui/icons-material/Menu';
// import Brightness4Icon from '@mui/icons-material/Brightness4'; // No longer needed
// import Brightness7Icon from '@mui/icons-material/Brightness7'; // No longer needed
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'; // Icon for theme selector
import AccountCircle from '@mui/icons-material/AccountCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import DevicesIcon from '@mui/icons-material/Devices';
import SecurityIcon from '@mui/icons-material/Security';
import BugReportIcon from '@mui/icons-material/BugReport';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import ApprovalIcon from '@mui/icons-material/Approval';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'; // Icon for Procurement
import { styled } from '@mui/material/styles';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth/useAuth'; // Updated import path for useAuth
import { useThemeContext } from '../context/ThemeContext/useThemeContext';

const drawerWidth = 240;
const appBarHeight = 64;

const openedMixin = (theme: Theme) => css`
  width: ${drawerWidth}px;
  transition: ${theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  })};
  overflow-x: hidden;
`;

const closedMixin = (theme: Theme) => css`
  transition: ${theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  })};
  overflow-x: hidden;
  width: calc(${theme.spacing(7)} + 1px);
  ${theme.breakpoints.up('sm')} {
    width: calc(${theme.spacing(8)} + 1px);
  }
`;

interface StyledAppBarProps {
  open?: boolean;
}

const StyledAppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<StyledAppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  height: `${appBarHeight}px`,
  backgroundColor:
    theme.palette.mode === 'light'
      ? theme.palette.primary.main
      : theme.palette.background.paper,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  ...(!open && {
    marginLeft: `calc(${theme.spacing(7)} + 1px)`,
    [theme.breakpoints.up('sm')]: {
      marginLeft: `calc(${theme.spacing(8)} + 1px)`,
    },
    width: `calc(100% - (calc(${theme.spacing(7)} + 1px)))`,
    [theme.breakpoints.up('sm')]: {
      width: `calc(100% - (calc(${theme.spacing(8)} + 1px)))`,
    },
  }),
}));

interface StyledDrawerProps {
  open: boolean;
}

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})<StyledDrawerProps>`
  flex-shrink: 0;
  white-space: nowrap;
  box-sizing: border-box;
  ${({ theme, open }) => (open ? openedMixin(theme) : closedMixin(theme))}
  & .MuiDrawer-paper {
    ${({ theme, open }) => (open ? openedMixin(theme) : closedMixin(theme))}
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
`;

function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Destructure `user` property from `useAuth`
  const { logout, user, isAuthenticated, loading: authLoading } = useAuth(); // Renamed loading to authLoading
  const { currentThemeName, setCurrentTheme, availableThemes } = useThemeContext();
  const theme = useTheme();
  const [open, setOpen] = useState(true);

  // Effect to handle redirection if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Show loading spinner while authentication status is being determined
  if (authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated after loading, render nothing (redirection is handled by useEffect)
  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login'); // Navigate to login page after logout
  };

  const moduleLinks = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    {
      text: 'Service Requests',
      icon: <DesignServicesIcon />,
      path: '/service-requests',
    },
    { text: 'Manage Assets', icon: <DevicesIcon />, path: '/assets' },
    {
      text: 'Procurement',
      icon: <ShoppingCartIcon />,
      path: '/procurement/memos',
    },
    { text: 'Manage Incidents', icon: <BugReportIcon />, path: '/incidents' },
    { text: 'Manage Changes', icon: <CompareArrowsIcon />, path: '/changes' },
    {
      text: 'Manage Configs',
      icon: <SettingsApplicationsIcon />,
      path: '/configs',
    },
    { text: 'Manage Workflows', icon: <ApprovalIcon />, path: '/workflows' },
    {
      text: 'Security & Access',
      icon: <SecurityIcon />,
      path: '/security-access',
    },
    { text: 'Reports & Analytics', icon: <AssessmentIcon />, path: '/reports' },
  ];

  const settingsNavItems = [
    { text: 'Logout', icon: <ExitToAppIcon />, onClick: handleLogout },
  ];

  const currentModule = moduleLinks.find((link) => {
    if (link.path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(link.path);
  }) || { text: 'ITSM Connect', icon: null };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <StyledAppBar id="app-bar" position="fixed" open={open}>
        <Toolbar>
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {currentModule.icon && (
              <Box
                sx={{ display: 'flex', alignItems: 'center', color: 'inherit' }}
              >
                {currentModule.icon}
              </Box>
            )}
            <Typography variant="h6" noWrap component="div" color="inherit">
              {currentModule.text}
            </Typography>
          </Box>
          <FormControl
            variant="outlined"
            size="small"
            sx={{ ml: 1, minWidth: 80, mr: 1 }}
          >
            <Select
              value={currentThemeName}
              onChange={(event) => setCurrentTheme(event.target.value as string)}
              IconComponent={PaletteOutlinedIcon} // Show palette icon instead of default arrow
              sx={{
                color: 'inherit',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.23)', // Lighter border for visibility
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                },
                '& .MuiSelect-icon': {
                  color: 'inherit',
                },
                '& .MuiSelect-select': {
                  paddingRight: '28px', // Ensure space for the icon
                  display: 'flex',
                  alignItems: 'center',
                }
              }}
              renderValue={(selectedValue) => (
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', mr: 1 }}> {/* Added mr: 1 and component span */}
                  {/* Optional: Show a small icon next to the text if desired */}
                  {/* <PaletteOutlinedIcon sx={{ fontSize: '1.2rem', mr: 0.5 }} /> */}
                  {(selectedValue as string).charAt(0).toUpperCase() + (selectedValue as string).slice(1)}
                </Box>
              )}
            >
              {availableThemes.map((themeName) => (
                <MenuItem key={themeName} value={themeName}>
                  {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          {user && (
            <Typography variant="subtitle1" color="inherit" sx={{ ml: 1 }}>
              Welcome, {user.name} ({user.role})!
            </Typography>
          )}
        </Toolbar>
      </StyledAppBar>
      <StyledDrawer id="side-drawer-desktop" variant="permanent" open={open}>
        <Toolbar
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: open ? 'space-between' : 'flex-end',
            alignItems: 'center',
            height: `${appBarHeight}px`,
            padding: open ? '0 0px' : '0 0px',
            boxSizing: 'border-box',
            borderStyle: 'hidden',
            flexShrink: 0,
            [theme.breakpoints.up('sm')]: {
              paddingLeft: open ? '16px' : '0px',
              paddingRight: open ? '16px' : '0px',
            },
          }}
        >
          {open && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                flexGrow: 1,
                mr: 1,
              }}
            >
              <img
                src="/images/sblt_fav_icon.png"
                alt="SBLT Logo"
                style={{
                  maxWidth: '120px',
                  height: 'auto',
                  marginBottom: '0px',
                  marginTop: '4px',
                  paddingLeft: '40px',
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  textAlign: 'center',
                  color: 'primary.main',
                  fontSize: '12px',
                  paddingLeft: '40px',
                }}
              >
                IT Service Management
              </Typography>
            </Box>
          )}
          <Button
            variant="text"
            onClick={() => setOpen(!open)}
            sx={{
              minWidth: 'auto',
              borderRadius: '4px',
              color: theme.palette.text.primary,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              '&:focus': {
                outline: 'none',
                border: 'none',
              },
              '&:focus-visible': {
                outline: 'none',
                border: 'none',
              },
              '&:active': {
                outline: 'none',
                border: 'none',
              },
              border: 'none',
              flexShrink: 0,
              ...(!open && {
                flexGrow: 1,
                justifyContent: 'center',
                minWidth: '64px',
                minHeight: '64px',
              }),
              ...(open && {
                flexGrow: 1,
                justifyContent: 'right',
                minHeight: '64px',
                minWidth: '16px',
              }),
            }}
          >
            {open ? (
              theme.direction === 'rtl' ? (
                <ChevronRightIcon />
              ) : (
                <ChevronLeftIcon />
              )
            ) : (
              <MenuIcon />
            )}
          </Button>
        </Toolbar>
        <List sx={{ flexGrow: 1, paddingTop: '12px' }}>
          {moduleLinks.map((item) => (
            <ListItem
              key={item.text}
              sx={{
                display: 'block',
                paddingTop: '2px',
                paddingLeft: '0px',
                paddingRight: '0px',
                paddingBottom: '0px',
              }}
            >
              <ListItemButton
                component={Link}
                to={item.path}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                }}
                selected={
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path)
                }
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 1 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{ opacity: open ? 1 : 0 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider
          sx={{
            paddingTop: '0px',
            paddingLeft: '0px',
            paddingRight: '0px',
            paddingBottom: '0px',
            mt: '0px',
            flexShrink: 0,
          }}
        />
        <List sx={{ flexShrink: 0 }}>
          {settingsNavItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                }}
                onClick={item.onClick}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 1 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{ opacity: open ? 1 : 0 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </StyledDrawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 1,
          marginTop: `${appBarHeight}px`,
          height: `calc(100vh - ${appBarHeight}px)`,
          overflowY: 'auto',
          boxSizing: 'border-box',
          minHeight: 0,
          backgroundColor: theme.palette.background.default,
          marginLeft: `calc(${theme.spacing(7)} + 0px -${theme.spacing(7)})`,
          [theme.breakpoints.up('sm')]: {
            marginLeft: `calc(${theme.spacing(8)} + 0px- ${theme.spacing(8)})`,
          },
          transition: theme.transitions.create(['margin-left'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(open && {
            marginLeft: 0,
            transition: theme.transitions.create(['margin-left'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
export default HomePage;
