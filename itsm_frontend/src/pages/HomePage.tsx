// itsm_frontend/src/pages/HomePage.tsx
import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar, // Make sure Toolbar is imported
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  IconButton,
  Divider,
  Button,
  useTheme,
} from '@mui/material';

// --- Icon Imports ---
import DashboardIcon from '@mui/icons-material/Dashboard';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';
import SecurityIcon from '@mui/icons-material/Security';
import BugReportIcon from '@mui/icons-material/BugReport';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import ApprovalIcon from '@mui/icons-material/Approval';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
// Theme toggle icons
import Brightness4Icon from '@mui/icons-material/Brightness4'; // Moon icon for dark mode
import Brightness7Icon from '@mui/icons-material/Brightness7'; // Sun icon for light mode
import LogoutIcon from '@mui/icons-material/Logout';

import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';

const drawerWidth = 260;
// Standard AppBar height in Material-UI is 64px for desktop
const appBarHeight = 64;

// Original module links - dummy menus removed
const moduleLinks = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Service Requests', icon: <RequestQuoteIcon />, path: '/service-requests' },
  { text: 'Manage Assets', icon: <DevicesOtherIcon />, path: '/assets' },
  { text: 'Security & Access', icon: <SecurityIcon />, path: '/security-access' },
  { text: 'Manage Incident', icon: <BugReportIcon />, path: '/incidents' },
  { text: 'Manage Changes', icon: <SwapHorizIcon />, path: '/changes' },
  { text: 'Manage Configs', icon: <SettingsSuggestIcon />, path: '/configs' },
  { text: 'Manage Workflows', icon: <ApprovalIcon />, path: '/workflows' },
  { text: 'Reports & Analytics', icon: <AnalyticsIcon />, path: '/reports' },
];

function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { logout, user } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const { toggleColorMode } = useThemeContext();

  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const currentModule = moduleLinks.find(
    (link) => {
      if (link.path === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(link.path);
    }
  ) || { text: 'ITSM Connect', icon: null };


  const drawer = (
    // This Box no longer has padding-top. The Toolbar inside will handle vertical alignment.
    <Box>
      {/* New Toolbar for the Drawer header, aligning with AppBar's height */}
      <Toolbar sx={{
        display: 'flex',
        flexDirection: 'row', // Stack logo and text vertically
        alignItems: 'center',
        justifyContent: 'center', // Center content vertically within the Toolbar
        padding: '20px', // Vertical padding only, horizontal padding for logo adjusted via img style
        height: `${appBarHeight}px`, // Ensure it matches AppBar height
        boxSizing: 'border-box' // Include padding in the height calculation
      }}>
        <img
          src="/images/sblt_fav_icon.png"
          alt="SBLT Logo"
          style={{ maxWidth: '95px', height: 'auto', marginBottom: '4px', marginTop: '4px'}} // Adjusted size for better fit
        />
        <Typography variant="h6" sx={{ textAlign: 'center', color: 'primary.main', fontSize: '14px', padding: '8px'}}> {/* Adjusted font size */}
          IT Service Management
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ padding: '8px' }}> {/* Add padding to the list for spacing */}
        {moduleLinks.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path)
              }
            >
              <ListItemIcon sx={{ color: 'text.secondary', minWidth: '40px' }}>
                {item.icon}
              </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: '16px',
                      color: 'text.primary'
                    }
                  }}
                />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    // Outermost Box: The root flex container for the entire page layout.
    // It takes up the full viewport height and width.
    <Box sx={{ display: 'flex', height: '100vh', width: '100%', boxSizing: 'border-box' }}>
      {/* App Bar (Top Navigation) */}
      <AppBar
        position="fixed"
        color="transparent"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginLeft: { sm: `${drawerWidth}px` },
          backgroundColor: theme.palette.background.paper,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          boxShadow: theme.shadows[1],
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ marginRight: '16px', display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: '8px' }}>
            {currentModule.icon && (
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'inherit' }}>
                {currentModule.icon}
              </Box>
            )}
            <Typography
              variant="h6"
              noWrap
              component="div"
              color="inherit"
            >
              {currentModule.text}
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{ marginRight: '16px' }} color="inherit">
              Welcome, {user ? user.name : 'Guest'}!
            </Typography>
            <Avatar sx={{ bgcolor: 'secondary.main', marginRight: '16px' }}>
              <AccountCircle />
            </Avatar>
            <IconButton color="inherit" sx={{ marginRight: '8px' }} onClick={toggleColorMode}>
              {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            <Button
              color="inherit"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{ textTransform: 'none' }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Side Drawer (Navigation Menu) */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 }, height: '100%' }}
        aria-label="mailbox folders"
      >
        {/* Temporary Drawer for Mobile */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true, // Better performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              height: '100%', // Ensure it fills the viewport height
              overflowY: 'auto', // Allow scrolling within the mobile drawer
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Permanent Drawer for Desktop */}
        <Drawer
          variant="permanent"
          elevation={16}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              height: `100%`, // The paper should take 100% of the nav box's height
              overflowY: 'auto', // Allow scrolling within the desktop drawer content
              backgroundColor: theme.palette.background.paper,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content Area: This Box will contain the content that scrolls.
          It fills the remaining space after the AppBar and Drawer. */}
      <Box
        component="main"
        sx={{
          flexGrow: 1, // Takes up remaining horizontal space
          display: 'flex',
          flexDirection: 'column', // Stack children vertically (your page content)
          backgroundColor: theme.palette.background.default,
          boxSizing: 'border-box',
          // This Box correctly occupies the space *next to* the drawer and *below* the app bar.
          marginTop: `${appBarHeight}px`, // Push content down by AppBar height
          height: `calc(100vh - ${appBarHeight}px)`, // Take remaining viewport height after AppBar
          overflowY: 'auto', // This is the primary scroll area for the entire page content
          minHeight: 0, // Important for flex item with overflow to allow shrinking
        }}
      >
        {/* This Box directly contains the Outlet content (your pages like ServiceRequestsPage).
            It will now be constrained by its parent and scroll if needed. */}
        <Box
          sx={{
            flexGrow: 1, // Allow content to fill available space within this main content area
            padding: '24px', // Page-level padding
            boxSizing: 'border-box',
            minHeight: 0, // Crucial for flex item in column layout to allow shrinking and thus overflow
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default HomePage;