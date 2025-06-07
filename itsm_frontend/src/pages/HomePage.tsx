// itsm_frontend/src/pages/HomePage.tsx
import React, { useState } from 'react';
import {
  AppBar, Box, Toolbar, IconButton, Typography, Drawer, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Divider, CssBaseline,
  useTheme
} from '@mui/material';
import type { Theme } from '@mui/material';
import { css } from '@emotion/react'; // <--- ADD THIS IMPORT
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
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
import ExitToAppIcon from '@mui/icons-material/ExitToApp'; // For Logout

import { styled } from '@mui/material/styles';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import { useThemeContext } from '../context/ThemeContext/useThemeContext';


const drawerWidth = 240;
const appBarHeight = 64; // Standard AppBar height for desktop

// Changed: Use css helper with template literals for mixins
const openedMixin = (theme: Theme) => css`
  width: ${drawerWidth}px;
  transition: ${theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  })};
  overflow-x: hidden;
`;

// Changed: Use css helper with template literals for mixins
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

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

// Define the props interface for StyledDrawer
interface StyledDrawerProps {
  open: boolean;
}

// Changed: Use template literal for styled component styles, and apply css helper output directly
const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })<StyledDrawerProps>`
  flex-shrink: 0;
  white-space: nowrap;
  box-sizing: border-box;

  // Apply general drawer styles based on 'open' state
  ${({ theme, open }) => open ? openedMixin(theme) : closedMixin(theme)}

  // Apply styles specifically to the internal paper element of the Drawer
  & .MuiDrawer-paper {
    ${({ theme, open }) => open ? openedMixin(theme) : closedMixin(theme)}
  }
`;


function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth(); // Get logout and user from AuthContext
  const { toggleColorMode, mode } = useThemeContext(); // Get toggleColorMode and mode from ThemeContext
  const theme = useTheme(); // Use Material-UI's useTheme hook to get the current theme object

  const [open, setOpen] = useState(true); // State for drawer open/close

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleLogout = () => {
    logout(); // Call logout from AuthContext
  };

  // Define main navigation items with icons and paths
  const mainNavItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Service Requests', icon: <DesignServicesIcon />, path: '/service-requests' },
    { text: 'Assets', icon: <DevicesIcon />, path: '/assets' },
    { text: 'Security & Access', icon: <SecurityIcon />, path: '/security-access' },
    { text: 'Incident Management', icon: <BugReportIcon />, path: '/incidents' },
    { text: 'Change Management', icon: <CompareArrowsIcon />, path: '/changes' },
    { text: 'Configuration Management', icon: <SettingsApplicationsIcon />, path: '/configs' },
    { text: 'Approval Workflow', icon: <ApprovalIcon />, path: '/workflows' },
    { text: 'Reports & Analytics', icon: <AssessmentIcon />, path: '/reports' },
  ];

  // Define settings/bottom navigation items
  const settingsNavItems = [
    { text: 'Logout', icon: <ExitToAppIcon />, onClick: handleLogout },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          height: `${appBarHeight}px`,
          backgroundColor: theme.palette.mode === 'light' ? theme.palette.primary.main : theme.palette.background.paper,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            ITSM Dashboard
          </Typography>
          <IconButton color="inherit" onClick={toggleColorMode}>
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
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
              {user.name} ({user.role})
            </Typography>
          )}
        </Toolbar>
      </AppBar>
      <StyledDrawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {mainNavItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                }}
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ mt: 'auto' }} /> {/* Pushes the following list to the bottom */}
        <List>
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
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </StyledDrawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3, // Padding around the content
          marginTop: `${appBarHeight}px`, // Space for the fixed AppBar
          height: `calc(100vh - ${appBarHeight}px)`, // Take remaining viewport height
          overflowY: 'auto', // Enable scrolling for content if it overflows
          boxSizing: 'border-box', // Include padding in height calculation
          minHeight: 0, // Allow content to shrink if needed
          backgroundColor: theme.palette.background.default, // Apply default background
        }}
      >
        {/* The Outlet renders the content of the nested routes */}
        <Outlet />
      </Box>
    </Box>
  );
}

export default HomePage;