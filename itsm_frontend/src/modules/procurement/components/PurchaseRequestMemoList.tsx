import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  TablePagination,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
// import EditIcon from '@mui/icons-material/Edit'; // Or VisibilityIcon for view - EditIcon is unused
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import {
  getPurchaseRequestMemos,
  cancelPurchaseRequestMemo,
  decidePurchaseRequestMemo
} from '../../../api/procurementApi';
import type {
  PurchaseRequestMemo,
  PurchaseRequestDecisionData,
  GetPurchaseRequestMemosParams
} from '../../../api/procurementApi';
import { useNavigate } from 'react-router-dom';

type Order = 'asc' | 'desc';

const PurchaseRequestMemoList: React.FC = () => {
  const { authenticatedFetch, user } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar, showConfirmDialog } = useUI();

  const [memos, setMemos] = useState<PurchaseRequestMemo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [totalMemos, setTotalMemos] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [sortConfigKey, setSortConfigKey] = useState<string>('-request_date'); // Default sort by request_date desc
  const [sortConfigDirection, setSortConfigDirection] = useState<Order>('desc');

  const [openDecisionDialog, setOpenDecisionDialog] = useState<boolean>(false);
  const [selectedMemoForDecision, setSelectedMemoForDecision] = useState<PurchaseRequestMemo | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | null>(null);
  const [decisionComments, setDecisionComments] = useState<string>('');

  const fetchMemos = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    setError(null);

    const params: GetPurchaseRequestMemosParams = {
      page: page + 1,
      pageSize: rowsPerPage,
      ordering: `${sortConfigDirection === 'desc' ? '-' : ''}${sortConfigKey}`,
    };

    try {
      const response = await getPurchaseRequestMemos(authenticatedFetch, params);
      setMemos(response.results);
      setTotalMemos(response.count);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to fetch purchase requests.');
      console.error("Failed to fetch purchase requests:", err);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, page, rowsPerPage, sortConfigKey, sortConfigDirection]);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSortRequest = (property: string) => {
    const isAsc = sortConfigKey === property && sortConfigDirection === 'asc';
    setSortConfigDirection(isAsc ? 'desc' : 'asc');
    setSortConfigKey(property);
  };

  const handleCreateNew = () => {
    navigate('/procurement/memos/new');
  };

  const handleViewOrEdit = (memoId: number) => {
    navigate(`/procurement/memos/edit/${memoId}`); // Or a dedicated view path
  };

  const handleOpenCancelDialog = (memo: PurchaseRequestMemo) => {
    showConfirmDialog(
      'Confirm Cancellation',
      `Are you sure you want to cancel this purchase request for "${memo.item_description.substring(0,50)}..."?`,
      async () => {
        if (!authenticatedFetch) return;
        setIsLoading(true); // Consider a more specific loading state
        try {
          await cancelPurchaseRequestMemo(authenticatedFetch, memo.id);
          showSnackbar('Purchase request cancelled successfully!', 'success');
          fetchMemos();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          showSnackbar(`Failed to cancel request: ${message}`, 'error');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const handleOpenDecisionDialog = (memo: PurchaseRequestMemo, decision: 'approved' | 'rejected') => {
    setSelectedMemoForDecision(memo);
    setDecisionType(decision);
    setDecisionComments(''); // Reset comments
    setOpenDecisionDialog(true);
  };

  const handleCloseDecisionDialog = () => {
    setOpenDecisionDialog(false);
    setSelectedMemoForDecision(null);
    setDecisionType(null);
    setDecisionComments('');
  };

  const handleConfirmDecision = async () => {
    if (!authenticatedFetch || !selectedMemoForDecision || !decisionType) return;

    setIsLoading(true); // Consider specific loading for this action
    const decisionData: PurchaseRequestDecisionData = {
      decision: decisionType,
      comments: decisionComments,
    };

    try {
      await decidePurchaseRequestMemo(authenticatedFetch, selectedMemoForDecision.id, decisionData);
      showSnackbar(`Purchase request ${decisionType} successfully!`, 'success');
      fetchMemos();
      handleCloseDecisionDialog();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message); // Show error in dialog or as snackbar
      showSnackbar(`Failed to ${decisionType} request: ${message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusChipColor = (status: PurchaseRequestMemo['status']) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'po_created': return 'info';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const headCells: { id: keyof PurchaseRequestMemo | string; label: string; sortable: boolean }[] = [
    { id: 'item_description', label: 'Item Description', sortable: true },
    { id: 'quantity', label: 'Qty', sortable: false },
    { id: 'requested_by_username', label: 'Requested By', sortable: true },
    { id: 'request_date', label: 'Request Date', sortable: true },
    { id: 'status', label: 'Status', sortable: true },
    { id: 'estimated_cost', label: 'Est. Cost', sortable: true },
    { id: 'approver_username', label: 'Approver', sortable: true },
    { id: 'actions', label: 'Actions', sortable: false },
  ];

  // Basic permission check examples (replace with actual role/permission logic)
  // const canApprove = user?.is_staff || user?.is_superuser; // Example
  // const isRequester = (memoUser: number) => user?.id === memoUser;

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Purchase Requests
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleCreateNew}
        sx={{ mb: 2 }}
      >
        Create New Request
      </Button>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              {headCells.map((headCell) => (
                <TableCell key={headCell.id} sortDirection={sortConfigKey === headCell.id ? sortConfigDirection : false}>
                  {headCell.sortable ? (
                    <TableSortLabel
                      active={sortConfigKey === headCell.id}
                      direction={sortConfigKey === headCell.id ? sortConfigDirection : 'asc'}
                      onClick={() => handleSortRequest(headCell.id)}
                    >
                      {headCell.label}
                    </TableSortLabel>
                  ) : (
                    headCell.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && memos.length === 0 && (
              <TableRow><TableCell colSpan={headCells.length} align="center"><CircularProgress /></TableCell></TableRow>
            )}
            {!isLoading && memos.length === 0 && (
              <TableRow><TableCell colSpan={headCells.length} align="center">No purchase requests found.</TableCell></TableRow>
            )}
            {memos.map((memo) => (
              <TableRow key={memo.id} hover>
                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Tooltip title={memo.item_description}><span>{memo.item_description}</span></Tooltip>
                </TableCell>
                <TableCell>{memo.quantity}</TableCell>
                <TableCell>{memo.requested_by_username}</TableCell>
                <TableCell>{new Date(memo.request_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip
                    label={memo.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    color={getStatusChipColor(memo.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{memo.estimated_cost != null ? `$${Number(memo.estimated_cost).toFixed(2)}` : '-'}</TableCell>
                <TableCell>{memo.approver_username || '-'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="View/Edit Details">
                    <IconButton onClick={() => handleViewOrEdit(memo.id)} size="small">
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  {memo.status === 'pending' && (user?.id === memo.requested_by || !!user?.is_staff) && (
                    <Tooltip title="Cancel Request">
                      <IconButton onClick={() => handleOpenCancelDialog(memo)} size="small" color="warning">
                        <CancelIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {/* Show approve/reject only for staff and if pending */}
                  {memo.status === 'pending' && !!user?.is_staff && (
                    <>
                      <Tooltip title="Approve Request">
                        <IconButton onClick={() => handleOpenDecisionDialog(memo, 'approved')} size="small" color="success">
                          <CheckCircleOutlineIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject Request">
                        <IconButton onClick={() => handleOpenDecisionDialog(memo, 'rejected')} size="small" color="error">
                          <HighlightOffIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalMemos}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </TableContainer>

      {/* Decision Dialog (Approve/Reject) */}
      <Dialog open={openDecisionDialog} onClose={handleCloseDecisionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
            {decisionType === 'approved' ? 'Approve' : 'Reject'} Purchase Request: {selectedMemoForDecision?.item_description.substring(0,30)}...
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{mb:2}}>
            Please provide comments for your decision (optional for approval, recommended for rejection).
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            name="comments"
            label="Comments"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={decisionComments}
            onChange={(e) => setDecisionComments(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDecisionDialog}>Cancel</Button>
          <Button onClick={handleConfirmDecision} variant="contained" color={decisionType === 'approved' ? 'success' : 'error'}>
            Confirm {decisionType === 'approved' ? 'Approval' : 'Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseRequestMemoList;
