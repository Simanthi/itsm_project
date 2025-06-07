// itsm_frontend/src/pages/ServiceRequestsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Button,
  Checkbox,
} from '@mui/material';

// --- Icon Imports for buttons ---
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import PreviewIcon from '@mui/icons-material/Preview';


// Define the structure of your service request data
interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  requestedBy: string;
  requestedDate: string;
}

// Mock Data (expanded to ensure overflow for testing)
const mockServiceRequests: ServiceRequest[] = [
  { id: 'SR001', title: 'Laptop repair', description: 'My laptop screen is cracked.', status: 'Open', requestedBy: 'Alice Johnson', requestedDate: '2024-05-28' },
  { id: 'SR002', title: 'Software installation', description: 'Need Photoshop installed on my new PC.', status: 'In Progress', requestedBy: 'Bob Smith', requestedDate: '2024-05-29' },
  { id: 'SR003', title: 'Network access issue', description: 'Cannot connect to company shared drive.', status: 'Resolved', requestedBy: 'Charlie Brown', requestedDate: '2024-05-29' },
  { id: 'SR004', title: 'New employee onboarding', description: 'Setup account for new hire, Jane Doe.', status: 'Closed', requestedBy: 'David Lee', requestedDate: '2024-05-30' },
  { id: 'SR005', title: 'Printer troubleshooting', description: 'Office printer is offline in room 305.', status: 'Open', requestedBy: 'Eve Davis', requestedDate: '2024-06-01' },
  { id: 'SR006', title: 'Monitor calibration', description: 'Need color calibration for design monitor.', status: 'Open', requestedBy: 'Frank White', requestedDate: '2024-06-02' },
  { id: 'SR007', title: 'Email configuration', description: 'Issues setting up Outlook on new laptop.', status: 'In Progress', requestedBy: 'Grace Hall', requestedDate: '2024-06-02' },
  { id: 'SR008', title: 'System upgrade request', description: 'Requesting OS upgrade to Windows 11.', status: 'Open', requestedBy: 'Henry Green', requestedDate: '2024-06-03' },
  { id: 'SR009', title: 'Password reset', description: 'Forgot VPN password, need a reset.', status: 'Resolved', requestedBy: 'Ivy Black', requestedDate: '2024-06-03' },
  { id: 'SR010', title: 'Software license query', description: 'Need to check status of Adobe Acrobat license.', status: 'Closed', requestedBy: 'Jack Blue', requestedDate: '2024-06-04' },
  { id: 'SR011', title: 'New Keyboard Request', description: 'My old keyboard is broken, need a new one.', status: 'Open', requestedBy: 'Karen Grey', requestedDate: '2024-06-04' },
  { id: 'SR012', title: 'VPN connection issue', description: 'VPN disconnects frequently from home.', status: 'In Progress', requestedBy: 'Liam Brown', requestedDate: '2024-06-05' },
  { id: 'SR013', title: 'Server access request', description: 'Need access to Dev server for testing.', status: 'Open', requestedBy: 'Mia Davis', requestedDate: '2024-06-05' },
  { id: 'SR014', title: 'New Printer Setup', description: 'Setting up a new network printer in Marketing.', status: 'Closed', requestedBy: 'Noah Green', requestedDate: '2024-06-06' },
  { id: 'SR015', title: 'Antivirus Update Failed', description: 'Antivirus definitions not updating on desktop.', status: 'Open', requestedBy: 'Olivia White', requestedDate: '2024-06-06' },
  { id: 'SR016', title: 'Monitor Flicker', description: 'External monitor flickers constantly.', status: 'In Progress', requestedBy: 'Peter Parker', requestedDate: '2024-06-07' },
  { id: 'SR017', title: 'Software Uninstall', description: 'Need to uninstall old CAD software.', status: 'Open', requestedBy: 'Quinn Red', requestedDate: '2024-06-07' },
  { id: 'SR018', title: 'Headset Malfunction', description: 'My company headset mic is not working.', status: 'Resolved', requestedBy: 'Rachel Green', requestedDate: '2024-06-08' },
  { id: 'SR019', title: 'New User Account', description: 'Setup new user account for intern.', status: 'Closed', requestedBy: 'Steve Rogers', requestedDate: '2024-06-08' },
  { id: 'SR020', title: 'Scanner Not Working', description: 'Office scanner not recognized by PC.', status: 'Open', requestedBy: 'Tina Fey', requestedDate: '2024-06-09' },
];


function ServiceRequestsPage() {
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

  useEffect(() => {
    setServiceRequests(mockServiceRequests);
  }, []);

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allIds = serviceRequests.map((request) => request.id);
      setSelectedRequestIds(allIds);
      return;
    }
    setSelectedRequestIds([]);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
    const selectedIndex = selectedRequestIds.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedRequestIds, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedRequestIds.slice(1));
    } else if (selectedIndex === selectedRequestIds.length - 1) {
      newSelected = newSelected.concat(selectedRequestIds.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedRequestIds.slice(0, selectedIndex),
        selectedRequestIds.slice(selectedIndex + 1),
      );
    }
    setSelectedRequestIds(newSelected);
  };

  const isSelected = (id: string) => selectedRequestIds.indexOf(id) !== -1;

  const handleCreateNew = () => {
    console.log('Create New Request clicked');
    // Implement form opening logic here (e.g., open a dialog)
  };

  const handleEdit = () => {
    if (selectedRequestIds.length === 1) {
      console.log('Edit Request clicked for ID:', selectedRequestIds[0]);
      // Implement form opening logic with pre-filled data
    } else {
      alert('Please select exactly one request to edit.');
    }
  };

  const handlePrintPreview = () => {
    if (selectedRequestIds.length > 0) {
      console.log('Print Preview clicked for IDs:', selectedRequestIds);
      // Implement print preview logic
    } else {
      alert('Please select at least one request to print preview.');
    }
  };

  const handlePrint = () => {
    if (selectedRequestIds.length > 0) {
      console.log('Print Request clicked for IDs:', selectedRequestIds);
      // Implement print logic
    } else {
      alert('Please select at least one request to print.');
    }
  };

  return (
    // This Box acts as the container for the Service Requests page content.
    // It should fill the space provided by the Outlet wrapper in HomePage.
    // It uses flexbox to arrange the buttons and the table vertically.
    <Box sx={{
      height: '100%', // Take 100% of the height from its parent (Outlet wrapper in HomePage)
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0, // Crucial for flex item in column layout to allow shrinking and thus overflow
    }}>
      {/* Action Buttons: Create, Edit, Print Preview, Print */}
      <Box sx={{ marginBottom: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-start', flexShrink: 0 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Create New Request
        </Button>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={handleEdit}
          disabled={selectedRequestIds.length !== 1}
        >
          Edit Request
        </Button>
        <Button
          variant="outlined"
          startIcon={<PreviewIcon />}
          onClick={handlePrintPreview}
          disabled={selectedRequestIds.length === 0}
        >
          Print Preview
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          disabled={selectedRequestIds.length === 0}
        >
          Print Request
        </Button>
      </Box>

      {/* Table Container */}
      {/* This TableContainer will grow to fill the remaining vertical space
          within the ServiceRequestsPage and will handle its own scrolling. */}
      <TableContainer component={Paper} sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table sx={{ minWidth: 650 /* REMOVED: maxWidth: 1000 */ }} aria-label="service requests table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedRequestIds.length > 0 && selectedRequestIds.length < serviceRequests.length}
                  checked={serviceRequests.length > 0 && selectedRequestIds.length === serviceRequests.length}
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all requests' }}
                />
              </TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell>Requested Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviceRequests.map((request, index) => {
              const isItemSelected = isSelected(request.id);
              return (
                <TableRow
                  hover
                  onClick={(event) => handleClick(event, request.id)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  key={`${request.id}-${index}`} // Using a combination of id and index for key, as mock IDs are not unique
                  selected={isItemSelected}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      inputProps={{ 'aria-labelledby': `sr-checkbox-${request.id}-${index}` }}
                    />
                  </TableCell>
                  <TableCell component="th" scope="row" id={`sr-checkbox-${request.id}-${index}`}>
                    {request.id}
                  </TableCell>
                  <TableCell>{request.title}</TableCell>
                  <TableCell>{request.description}</TableCell>
                  <TableCell>{request.status}</TableCell>
                  <TableCell>{request.requestedBy}</TableCell>
                  <TableCell>{request.requestedDate}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default ServiceRequestsPage;