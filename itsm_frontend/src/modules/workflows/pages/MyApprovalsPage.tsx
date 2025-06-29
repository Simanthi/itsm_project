import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Chip, Tooltip
} from '@mui/material';
import { DataGrid, type GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link as RouterLink } from 'react-router-dom';

import {
  type ApprovalStep,
  type ApprovalActionPayload,
  type GetApprovalStepsParams
} from '../../procurement/types/procurementTypes'; // Use types from procurement
import {
  getApprovalSteps,
  approveApprovalStep,
  rejectApprovalStep
} from '../../../api/procurementApi'; // Use API functions from procurement
import { useUI } from '../../../context/UIContext/useUI';
import { useAuth } from '../../../context/auth/useAuth';

const MyApprovalsPage: React.FC = () => {
  const { showSnackbar } = useUI();
  const { authenticatedFetch, isAuthenticated, loading: authLoading } = useAuth();
  const [myPendingSteps, setMyPendingSteps] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ApprovalStep | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchMyPendingSteps = useCallback(async () => {
    if (!isAuthenticated && !authLoading) {
      setError("User is not authenticated. Cannot load approvals.");
      setLoading(false);
      setMyPendingSteps([]);
      return;
    }
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!authenticatedFetch) return;

    setLoading(true);
    const params: GetApprovalStepsParams = { status: 'pending', pageSize: 100 };
    try {
      const response = await getApprovalSteps(authenticatedFetch, params);
      setMyPendingSteps(response.results);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch pending approvals.';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
      setMyPendingSteps([]);
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, authenticatedFetch, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) { // Only fetch if authenticated
      fetchMyPendingSteps();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false); // Stop loading if not authenticated
      setMyPendingSteps([]); // Clear any existing steps
      setError("Please log in to view your approvals."); // Set an informative error
    } else {
      setLoading(true); // Still loading auth status
    }
  }, [fetchMyPendingSteps, authLoading, isAuthenticated]);

  const handleOpenActionDialog = (step: ApprovalStep, type: 'approve' | 'reject') => {
    setCurrentStep(step);
    setActionType(type);
    setComments(step.comments || ''); // Pre-fill comments if any exist (e.g. from previous rejection)
    setActionDialogOpen(true);
  };

  const handleCloseActionDialog = () => {
    setActionDialogOpen(false);
    setCurrentStep(null);
    setActionType(null);
    setComments(''); // Clear comments on close
  };

  const handleSubmitAction = async () => {
    if (!currentStep || !actionType) return;
    if (!authenticatedFetch || !isAuthenticated) {
      showSnackbar('User not authenticated. Cannot perform action.', 'error');
      return;
    }

    if (actionType === 'reject' && !comments.trim()) {
        showSnackbar('Comments are required for rejection.', 'warning');
        // setError('Comments are required for rejection.'); // Not setting global error for this
        return;
    }

    setIsSubmittingAction(true);
    const payload: ApprovalActionPayload = { comments };
    try {
      if (actionType === 'approve') {
        await approveApprovalStep(authenticatedFetch, currentStep.id, payload);
        showSnackbar('Step approved successfully!', 'success');
      } else if (actionType === 'reject') {
        await rejectApprovalStep(authenticatedFetch, currentStep.id, payload);
        showSnackbar('Step rejected successfully!', 'success');
      }
      await fetchMyPendingSteps();
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
      field: 'content_object_display',
      headerName: 'Item for Approval',
      width: 350,
      renderCell: (params) => (
        <Tooltip title={params.value || ''}>
            <Typography variant="body2" noWrap>
            {params.value || 'N/A'}
            </Typography>
        </Tooltip>
      )
    },
    {
      field: 'rule_name_snapshot',
      headerName: 'Approval Rule / Step Name',
      width: 250,
      valueGetter: (_value, row) => row.rule_name_snapshot || row.approval_rule_name || `Step ${row.step_order}`
    },
    { field: 'step_order', headerName: 'Order', width: 80, align: 'center' },
    {
      field: 'status_display',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => <Chip label={params.value || params.row.status} size="small" />
    },
    {
      field: 'created_at',
      headerName: 'Step Assigned',
      width: 180,
      valueGetter: (_value, row) => formatDate(row.created_at)
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: ({ row }) => [
        <GridActionsCellItem
          icon={<OpenInNewIcon color="info" />}
          label="View Item"
          component={RouterLink}
          to={row.content_object_url || '#'}
          target="_blank"
          disabled={!row.content_object_url}
          key={`view-${row.id}`}
          sx={!row.content_object_url ? { display: 'none' } : {}}
        />,
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

  if (authLoading || (loading && myPendingSteps.length === 0 && isAuthenticated)) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  if (!isAuthenticated && !authLoading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Typography variant="h5" component="h1" sx={{ mb: 2 }}>My Pending Approvals</Typography>
        <Alert severity="info">{error || "Please log in to view your pending approvals."}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Typography variant="h5" component="h1" gutterBottom>
        My Pending Approvals
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && myPendingSteps.length === 0 && (
         <Typography sx={{mt: 2}}>You have no pending approvals.</Typography>
      )}

      {myPendingSteps.length > 0 && !error && (
        <Box sx={{ height: 600, width: '100%', mt: 2 }}>
          <DataGrid
            rows={myPendingSteps}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            loading={loading} // DataGrid's own loading prop
          />
        </Box>
      )}

      <Dialog open={actionDialogOpen} onClose={handleCloseActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{actionType?.replace(/^\w/, c => c.toUpperCase())} Approval Step</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Item: {currentStep?.content_object_display || 'N/A'}
          </Typography>
          {currentStep?.content_object_url && (
            <Button
                size="small"
                startIcon={<OpenInNewIcon />}
                component={RouterLink}
                to={currentStep.content_object_url}
                target="_blank"
                sx={{mb:1}}
            >
                View Full Item
            </Button>
          )}
          <TextField
            label={`Comments ${actionType === 'reject' ? '(Required)' : '(Optional)'}`}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
            error={actionType === 'reject' && !comments.trim() && isSubmittingAction} // Show error if reject and no comments during submit attempt
            helperText={actionType === 'reject' && !comments.trim() && isSubmittingAction ? "Comments are required for rejection." : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActionDialog} disabled={isSubmittingAction}>Cancel</Button>
          <Button
            onClick={handleSubmitAction}
            variant="contained"
            color={actionType === 'approve' ? 'success' : 'error'}
            disabled={isSubmittingAction || (actionType === 'reject' && !comments.trim())}
          >
            {isSubmittingAction ? <CircularProgress size={24} /> : (actionType === 'approve' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyApprovalsPage;
