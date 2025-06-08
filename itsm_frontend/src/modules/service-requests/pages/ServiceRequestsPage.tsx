// itsm_frontend/src/features/serviceRequests/pages/ServiceRequestsPage.tsx
import React, { useState } from 'react';
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
import { useNavigate } from 'react-router-dom';

// --- Icon Imports for buttons ---
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import PreviewIcon from '@mui/icons-material/Preview';

//import { type ServiceRequest } from '../types/ServiceRequestTypes';
import { useServiceRequests } from '../hooks/useServiceRequests';


function ServiceRequestsPage() {
  const navigate = useNavigate();
  const { serviceRequests } = useServiceRequests();

  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allIds = serviceRequests.map((request) => request.id);
      setSelectedRequestIds(allIds);
      return;
    }
    setSelectedRequestIds([]);
  };

  const handleClick = (_event: React.MouseEvent<unknown>, id: string) => {
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
    navigate('/service-requests/new');
  };

  const handleEdit = () => {
    if (selectedRequestIds.length === 1) {
      const requestIdToEdit = selectedRequestIds[0];
      // Navigate to the edit page, passing the ID in the URL
      navigate(`/service-requests/edit/${requestIdToEdit}`);
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
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }}>
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

      <TableContainer component={Paper} sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table sx={{ minWidth: 650 }} aria-label="service requests table">
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
            {/* Ensure serviceRequests is not empty before mapping */}
            {serviceRequests.map((request, index) => {
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