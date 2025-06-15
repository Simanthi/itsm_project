import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Typography } from '@mui/material';
import AssetList from './components/AssetList';
import CategoryManagement from './components/CategoryManagement';
import LocationManagement from './components/LocationManagement';
import VendorManagement from './components/VendorManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`asset-tabpanel-${index}`}
      aria-labelledby={`asset-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}> {/* Add padding to the content of the tab panel */}
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `asset-tab-${index}`,
    'aria-controls': `asset-tabpanel-${index}`,
  };
}

const AssetsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: '100%', p: { xs: 1, sm: 2, md: 1 } }}> {/* Responsive padding */}
      <Typography variant="h4" gutterBottom sx={{ mb: 1 , mx: { xs: 1, sm: 1 } }}>
        Asset Management
      </Typography>
      <Paper elevation={2} sx={{ width: '100%'}}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="Asset management tabs"
            variant="scrollable" // Allows tabs to scroll on smaller screens
            scrollButtons="auto" // Show scroll buttons automatically
            allowScrollButtonsMobile
          >
            <Tab label="Assets" {...a11yProps(0)} />
            <Tab label="Categories" {...a11yProps(1)} />
            <Tab label="Locations" {...a11yProps(2)} />
            <Tab label="Vendors" {...a11yProps(3)} />
          </Tabs>
        </Box>
        <TabPanel value={activeTab} index={0}>
          <AssetList />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <CategoryManagement />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <LocationManagement />
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          <VendorManagement />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AssetsPage;
