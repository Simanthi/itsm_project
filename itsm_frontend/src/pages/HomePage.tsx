// itsm_frontend/src/pages/HomePage.tsx
import React from 'react';
import {  Link, Outlet, useLocation } from 'react-router-dom'; // <--- Remove useNavigate here
import {
  AppBar,
  Toolbar,
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

const drawerWidth = 260; // Your chosen drawer width

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
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const { logout, user } = useAuth();
  // const navigate = useNavigate(); // <--- REMOVE THIS LINE
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
    // navigate('/login'); // <--- REMOVE OR COMMENT OUT THIS LINE (logout already navigates)
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
    <Box sx={{ p: 1 }}>
      {/* Company Logo and Text Container */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
        <img
          src="/images/sblt_fav_icon.png"
          alt="SBLT Logo"
          style={{ maxWidth: '100px', height: 'auto', marginBottom: '8px' }}
        />
        <Typography variant="h6" sx={{ textAlign: 'center', color: 'primary.main' }}>
          IT Service Management
        </Typography>
      </Box>
      <Divider />
      <List>
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
    <Box sx={{ display: 'flex' }}>
      {/* App Bar (Top Navigation) */}
      <AppBar
        position="fixed"
        color="transparent"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
            {currentModule.icon && (
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'inherit' }}>
                {currentModule.icon}
              </Box>
            )}
            <Typography
              variant="h1"
              noWrap
              component="div"
              color="inherit"
            >
              {currentModule.text}
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Display user name from auth context */}
            <Typography variant="body1" sx={{ mr: 2 }} color="inherit">
              Welcome, {user ? user.name : 'Guest'}!
            </Typography>
            <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
              <AccountCircle />
            </Avatar>
            {/* Theme Toggle Button */}
            <IconButton color="inherit" sx={{ mr: 1 }} onClick={toggleColorMode}>
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
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          elevation={16}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          //width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: '0px', sm: '0px' },
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

export default HomePage;