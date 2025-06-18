import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Paper, Grid,
  Dialog, DialogTitle, DialogContent, TextField, DialogActions, Chip
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { ApprovalStep, ApprovalActionPayload } from '../types';
import { getMyApprovalSteps, approveStep, rejectStep, getApprovalRequestById } from '../api';
import { useUI } from '../../../context/UIContext/useUI';
import { Link as RouterLink } from 'react-router-dom'; // For linking to content object

const MyApprovalsPage: React.FC = () => {
  const { showSnackbar } = useUI();
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
    setLoading(true);
    try {
      const steps = await getMyApprovalSteps('pending');
      setMyPendingSteps(steps);
      setError(null);

      // Fetch details for each associated ApprovalRequest to display title/content
      const uniqueRequestIds = Array.from(new Set(steps.map(step => step.approval_request)));
      const detailsPromises = uniqueRequestIds.map(id => getApprovalRequestById(id));
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
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchMyPendingSteps();
  }, [fetchMyPendingSteps]);

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
    setIsSubmittingAction(true);
    const payload: ApprovalActionPayload = { comments };
    try {
      if (actionType === 'approve') {
        await approveStep(currentStep.id, payload);
        showSnackbar('Step approved successfully!', 'success');
      } else {
        await rejectStep(currentStep.id, payload);
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
        // Basic link example - ideally, construct URL based on type
        // For now, just display text. A real link would need more context/logic or a get_absolute_url from backend.
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
        // This requires fetching the parent ApprovalRequest or ensuring this data is nested
        // For now, this column might be empty or you'd adapt the data structure.
        // Placeholder:
        const reqDetail = requestDetails[row.approval_request];
        // This assumes ApprovalRequest itself has created_at, which it does.
        // To show this, ensure your API for steps nests ApprovalRequest details or fetch separately.
        // My current fetchMyPendingSteps is fetching ApprovalRequest details.
        return reqDetail && (myPendingSteps.find(s => s.approval_request === row.approval_request) as any)?.approval_request_details?.created_at
            ? formatDate((myPendingSteps.find(s => s.approval_request === row.approval_request) as any).approval_request_details.created_at)
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
          icon={<CheckCircleOutlineIcon />}
          label="Approve"
          onClick={() => handleOpenActionDialog(row, 'approve')}
          key={`approve-${row.id}`}
          color="success"
        />,
        <GridActionsCellItem
          icon={<HighlightOffIcon />}
          label="Reject"
          onClick={() => handleOpenActionDialog(row, 'reject')}
          key={`reject-${row.id}`}
          color="error"
        />,
      ],
    },
  ];

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }
  if (error && myPendingSteps.length === 0) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Typography variant="h5" component="h1" gutterBottom>
        My Pending Approvals
      </Typography>
      {error && myPendingSteps.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{`Error refreshing data: ${error}`}</Alert>}

      <Box sx={{ height: 600, width: '100%' }}>
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
