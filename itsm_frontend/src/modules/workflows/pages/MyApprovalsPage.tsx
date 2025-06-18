import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Chip
} from '@mui/material';
import { DataGrid, type GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { type ApprovalStep, type ApprovalActionPayload } from '../types';
import { getMyApprovalSteps, approveStep, rejectStep, getApprovalRequestById } from '../api';
import { useUI } from '../../../context/UIContext/useUI';
import { useAuth } from '../../../context/auth/useAuth'; // Import useAuth
import type { AuthenticatedFetch } from '../../../context/auth/AuthContextDefinition'; // Import AuthenticatedFetch type

const MyApprovalsPage: React.FC = () => {
  const { showSnackbar } = useUI();
  const { authenticatedFetch, isAuthenticated, loading: authLoading } = useAuth(); // Destructure from useAuth
  const [myPendingSteps, setMyPendingSteps] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ApprovalStep | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // State to store fetched ApprovalRequest titles/details
  const [requestDetails, setRequestDetails] = useState<Record<number, { title: string, contentDisplay?: string }>>({});

  const fetchMyPendingSteps = useCallback(async () => {
    if (!isAuthenticated && !authLoading) {
      setError("User is not authenticated. Cannot load approvals.");
      setLoading(false);
      setMyPendingSteps([]);
      setRequestDetails({});
      return;
    }
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!authenticatedFetch) return;

    setLoading(true);
    try {
      const steps = await getMyApprovalSteps(authenticatedFetch, 'pending'); // Pass authenticatedFetch
      setMyPendingSteps(steps);
      setError(null);

      if (steps.length > 0) {
        const uniqueRequestIds = Array.from(new Set(steps.map(step => step.approval_request)));
        const detailsPromises = uniqueRequestIds.map(id => getApprovalRequestById(authenticatedFetch, id)); // Pass authenticatedFetch
        const fetchedRequests = await Promise.all(detailsPromises);

        const detailsMap: Record<number, { title: string, contentDisplay?: string }> = {};
        fetchedRequests.forEach(req => {
        detailsMap[req.id] = {
          title: req.title,
          contentDisplay: req.content_object_display?.display || req.content_object_display?.title || `Item ID: ${req.object_id} (Type: ${req.content_object_display?.type})`
        };
      });
      setRequestDetails(detailsMap);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch pending approvals.';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
      setMyPendingSteps([]);
      setRequestDetails({});
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, authenticatedFetch, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading) { // Only fetch if auth state is resolved
        fetchMyPendingSteps();
    } else {
        setLoading(true); // Set loading true if auth is initially loading
    }
  }, [fetchMyPendingSteps, authLoading]);

  const handleOpenActionDialog = (step: ApprovalStep, type: 'approve' | 'reject') => {
    setCurrentStep(step);
    setActionType(type);
    setComments(''); // Reset comments
    setActionDialogOpen(true);
  };

  const handleCloseActionDialog = () => {
    setActionDialogOpen(false);
    setCurrentStep(null);
    setActionType(null);
  };

  const handleSubmitAction = async () => {
    if (!currentStep || !actionType) return;
    if (!authenticatedFetch || !isAuthenticated) {
      showSnackbar('User not authenticated. Cannot perform action.', 'error');
      return;
    }
    setIsSubmittingAction(true);
    const payload: ApprovalActionPayload = { comments };
    try {
      if (actionType === 'approve') {
        await approveStep(authenticatedFetch, currentStep.id, payload); // Pass authenticatedFetch
        showSnackbar('Step approved successfully!', 'success');
      } else {
        await rejectStep(authenticatedFetch, currentStep.id, payload); // Pass authenticatedFetch
        showSnackbar('Step rejected successfully!', 'success');
      }
      await fetchMyPendingSteps(); // Refresh list
      handleCloseActionDialog();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to ${actionType} step.`;
      showSnackbar(errorMsg, 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };


  const columns: GridColDef<ApprovalStep>[] = [
    {
      field: 'approval_request_title',
      headerName: 'Approval For',
      width: 300,
      valueGetter: (_value, row) => requestDetails[row.approval_request]?.title || `Request ID: ${row.approval_request}`,
    },
    {
      field: 'content_object',
      headerName: 'Related Item',
      width: 300,
      renderCell: (params) => {
        const detail = requestDetails[params.row.approval_request];
        return (
          <Typography variant="body2">
            {detail?.contentDisplay || 'N/A'}
          </Typography>
        );
      }
    },
    { field: 'step_order', headerName: 'Step', width: 80 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (params) => <Chip label={params.value} size="small" /> },
    {
      field: 'approval_request_created_at',
      headerName: 'Request Created',
      width: 180,
      valueGetter: (_value, row) => {
        const reqDetail = requestDetails[row.approval_request];
        return reqDetail && (myPendingSteps.find(s => s.approval_request === row.approval_request) as ApprovalStep & { approval_request_details?: { created_at?: string } })?.approval_request_details?.created_at
          ? formatDate((myPendingSteps.find(s => s.approval_request === row.approval_request) as ApprovalStep & { approval_request_details?: { created_at?: string } }).approval_request_details?.created_at)
          : 'Loading...';
      }
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: ({ row }) => [
        <GridActionsCellItem
          icon={<CheckCircleOutlineIcon color="success" />}
          label="Approve"
          onClick={() => handleOpenActionDialog(row, 'approve')}
          key={`approve-${row.id}`}
        />,
        <GridActionsCellItem
          icon={<HighlightOffIcon color="error" />}
          label="Reject"
          onClick={() => handleOpenActionDialog(row, 'reject')}
          key={`reject-${row.id}`}
        />,
      ],
    },
  ];

  if ((loading && myPendingSteps.length === 0) || (authLoading && !isAuthenticated && myPendingSteps.length === 0)) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  if (!isAuthenticated && !authLoading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Typography variant="h5" component="h1" sx={{ mb: 2 }}>My Pending Approvals</Typography>
        <Alert severity="info">Please log in to view your pending approvals.</Alert>
      </Box>
    );
  }

  if (error && myPendingSteps.length === 0 && isAuthenticated && !authLoading) {
    return (
        <Box sx={{ p: 3, width: '100%' }}>
            <Typography variant="h5" component="h1" sx={{ mb: 2 }}>My Pending Approvals</Typography>
            <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Typography variant="h5" component="h1" gutterBottom>
        My Pending Approvals
      </Typography>
      {error && myPendingSteps.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{`Operation error: ${error}`}</Alert>}
      {myPendingSteps.length === 0 && !loading && !error && isAuthenticated && !authLoading && (
         <Typography sx={{mt: 2}}>You have no pending approvals.</Typography>
      )}
      <Box sx={{ height: 600, width: '100%', mt: myPendingSteps.length === 0 ? 0 : 2  }}>
        <DataGrid
          rows={myPendingSteps}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          loading={loading}
        />
      </Box>

      <Dialog open={actionDialogOpen} onClose={handleCloseActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{actionType === 'approve' ? 'Approve Step' : 'Reject Step'}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1">
            Item: {currentStep && requestDetails[currentStep.approval_request]?.title}
          </Typography>
          <Typography variant="body2" gutterBottom>
            Details: {currentStep && requestDetails[currentStep.approval_request]?.contentDisplay}
          </Typography>
          <TextField
            label="Comments (Optional)"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActionDialog} disabled={isSubmittingAction}>Cancel</Button>
          <Button onClick={handleSubmitAction} variant="contained" color={actionType === 'approve' ? 'success' : 'error'} disabled={isSubmittingAction}>
            {isSubmittingAction ? <CircularProgress size={24} /> : (actionType === 'approve' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyApprovalsPage;
