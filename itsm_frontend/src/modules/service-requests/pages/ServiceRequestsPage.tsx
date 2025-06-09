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
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// --- Icon Imports for buttons ---
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import PreviewIcon from '@mui/icons-material/Preview';


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
      navigate(`/service-requests/edit/${requestIdToEdit}`);
    } else {
      alert('Please select exactly one request to edit.');
    }
  };

  const handlePrintPreview = () => {
    if (selectedRequestIds.length > 0) {
      navigate('/service-requests/print-preview', { state: { selectedIds: selectedRequestIds } });
    } else {
      alert('Please select at least one request to print preview.');
    }
  };

  // <<< MODIFIED: This is the function we are changing
  const handlePrint = () => {
    if (selectedRequestIds.length > 0) {
      navigate('/service-requests/print-preview', {
        state: {
          selectedIds: selectedRequestIds,
          autoPrint: true
        }
      });
    } else {
      alert('Please select at least one request to print.');
    }
  };
  // >>> END MODIFICATION

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      p: 0,
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
          onClick={handlePrint} // This button will now auto-trigger print
          disabled={selectedRequestIds.length === 0}
        >
          Print Request
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table stickyHeader sx={{ minWidth: 1000 }} aria-label="service requests table">
          <TableHead
            sx={{
              '& .MuiTableCell-stickyHeader': {
                backgroundColor: (theme) => theme.palette.primary.main, // Changed to primary.main
                color: (theme) => theme.palette.primary.contrastText,  // Added for text readability
                zIndex: 100,
                alignContent: 'left',
                textWrap: 'nowrap', 


              },
            }}
          >
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedRequestIds.length > 0 && selectedRequestIds.length < serviceRequests.length}
                  checked={serviceRequests.length > 0 && selectedRequestIds.length === serviceRequests.length}
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all requests' }}
                />
              </TableCell>
              <TableCell>Request ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Requested By</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviceRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    No service requests found.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click "Create New Request" to add one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              serviceRequests.map((request, index) => {
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
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} component="th" scope="row" id={`sr-checkbox-${request.id}-${index}` }>
                      {request.request_id}
                    </TableCell>
                    <TableCell>{request.title}</TableCell>
                    <TableCell>
                      {request.category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                    </TableCell>
                    <TableCell>
                      {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {request.status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                    </TableCell>
                    <TableCell>{request.requested_by}</TableCell>
                    <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{request.assigned_to || 'Unassigned'}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {request.description}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default ServiceRequestsPage;