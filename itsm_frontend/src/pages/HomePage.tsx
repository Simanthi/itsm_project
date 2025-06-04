// itsm_frontend/src/pages/HomePage.tsx
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Button, // <--- Import Button for Logout
} from '@mui/material';

// --- Icon Imports (ensure all these are present) ---
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
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import LogoutIcon from '@mui/icons-material/Logout';

import { useAuth } from '../context/AuthContext'; // Make sure this path is correct: ../context/AuthContext

const drawerWidth = 240;


// ... (moduleLinks definition remains the same)
const moduleLinks = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Service Requests', icon: <RequestQuoteIcon />, path: '/service-requests' },
  { text: 'Manage Assets', icon: <DevicesOtherIcon />, path: '/assets' },
  { text: 'Security & Access', icon: <SecurityIcon />, path: '/security-access' },
  { text: 'Incident Management', icon: <BugReportIcon />, path: '/incidents' },
  { text: 'Change Management', icon: <SwapHorizIcon />, path: '/changes' },
  { text: 'Manage Configuration', icon: <SettingsSuggestIcon />, path: '/configs' },
  { text: 'Approval Workflow', icon: <ApprovalIcon />, path: '/workflows' },
  { text: 'Reports & Analytics', icon: <AnalyticsIcon />, path: '/reports' },
];


function HomePage() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const { logout } = useAuth(); // <--- Get logout function from context
  const navigate = useNavigate(); // Still needed for programmatic navigation after logout

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
    logout(); // Call context logout, which clears token from localStorage
    navigate('/login'); // Redirect to login page after logout
  };

  const drawer = (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ my: 2, textAlign: 'center', color: 'primary.main' }}>
        ITSM Connect
      </Typography>
      <Divider />
      <List>
        {moduleLinks.map((item) => ( // <--- moduleLinks is now accessible here
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
            >
            <ListItemIcon sx={{ color: 'text.secondary', minWidth: '30px' }}> {/* <--- ADD/CHANGE minWidth */}
              {item.icon}
            </ListItemIcon>
              <ListItemText primary={item.text} />
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
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          
          ml: { sm: `${drawerWidth}px` },
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

          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
          >
            IT Service Management
          </Typography>

          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              Welcome, John Doe!
            </Typography>
            <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
              <AccountCircle />
            </Avatar>
            <IconButton color="inherit" sx={{ mr: 1 }}> {/* Added margin for spacing */}
              <SettingsBrightnessIcon />
            </IconButton>
            {/* --- LOGOUT BUTTON --- */}
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
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: '56px', sm: '64px' }
        }}
      >
        <Toolbar />
        <Typography paragraph>
          Your dashboard content will go here.
        </Typography>
        <Typography paragraph>
          This is where you'll display key metrics, quick links, and an overview of your ITSM system.
        </Typography>
      </Box>
    </Box>
  );
}

export default HomePage;