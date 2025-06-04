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

// --- Icon Imports for buttons (ensure these are imported globally or here) ---
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

// Mock Data (replace with fetched data from your backend later)
const mockServiceRequests: ServiceRequest[] = [
  { id: 'SR001', title: 'Laptop repair', description: 'My laptop screen is cracked.', status: 'Open', requestedBy: 'Alice Johnson', requestedDate: '2024-05-28' },
  { id: 'SR002', title: 'Software installation', description: 'Need Photoshop installed on my new PC.', status: 'In Progress', requestedBy: 'Bob Smith', requestedDate: '2024-05-29' },
  { id: 'SR003', title: 'Network access issue', description: 'Cannot connect to company shared drive.', status: 'Resolved', requestedBy: 'Charlie Brown', requestedDate: '2024-05-29' },
  { id: 'SR004', title: 'New employee onboarding', description: 'Setup account for new hire, Jane Doe.', status: 'Closed', requestedBy: 'David Lee', requestedDate: '2024-05-30' },
  { id: 'SR005', title: 'Printer troubleshooting', description: 'Office printer is offline in room 305.', status: 'Open', requestedBy: 'Eve Davis', requestedDate: '2024-06-01' },
  { id: 'SR001', title: 'Laptop repair', description: 'My laptop screen is cracked.', status: 'Open', requestedBy: 'Alice Johnson', requestedDate: '2024-05-28' },
  { id: 'SR002', title: 'Software installation', description: 'Need Photoshop installed on my new PC.', status: 'In Progress', requestedBy: 'Bob Smith', requestedDate: '2024-05-29' },
  { id: 'SR003', title: 'Network access issue', description: 'Cannot connect to company shared drive.', status: 'Resolved', requestedBy: 'Charlie Brown', requestedDate: '2024-05-29' },
  { id: 'SR004', title: 'New employee onboarding', description: 'Setup account for new hire, Jane Doe.', status: 'Closed', requestedBy: 'David Lee', requestedDate: '2024-05-30' },
  { id: 'SR005', title: 'Printer troubleshooting', description: 'Office printer is offline in room 305.', status: 'Open', requestedBy: 'Eve Davis', requestedDate: '2024-06-01' },
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
    <Box sx={{ p: 2 }}>
      {/* REMOVED: Typography variant="h4" for "Service Requests" header */}

      {/* Action Buttons: Create, Edit, Print Preview, Print */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, justifyContent: 'flex-start' }}> {/* <--- MODIFIED BOX */}
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

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 , maxWidth:1000}} aria-label="service requests table">
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
            {serviceRequests.map((request) => {
              const isItemSelected = isSelected(request.id);
              return (
                <TableRow
                  hover
                  onClick={(event) => handleClick(event, request.id)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  key={request.id}
                  selected={isItemSelected}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      inputProps={{ 'aria-labelledby': `sr-checkbox-${request.id}` }}
                    />
                  </TableCell>
                  <TableCell component="th" scope="row" id={`sr-checkbox-${request.id}`}>
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