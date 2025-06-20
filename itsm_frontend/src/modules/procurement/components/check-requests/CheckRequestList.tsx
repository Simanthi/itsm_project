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
  MenuItem,
  Select,
  FormControl,
  InputLabel, // Added FormControl and InputLabel
  Checkbox, // Import Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print'; // Import PrintIcon
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send'; // Submit for approval
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt'; // Approve
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt'; // Reject
import PaymentsIcon from '@mui/icons-material/Payments'; // Mark processing or confirm payment
import PriceCheckIcon from '@mui/icons-material/PriceCheck'; // Confirm payment
import CancelIcon from '@mui/icons-material/CancelOutlined';

import { useAuth } from '../../../../context/auth/useAuth';
import { useUI } from '../../../../context/UIContext/useUI';
import {
  getCheckRequests,
  submitCheckRequestForApproval,
  approveCheckRequestByAccounts,
  rejectCheckRequestByAccounts,
  markCheckRequestPaymentProcessing,
  confirmCheckRequestPayment,
  cancelCheckRequest,
} from '../../../../api/procurementApi';
import type {
  CheckRequest,
  GetCheckRequestsParams,
  CheckRequestStatus,
  PaymentMethod,
  // AccountsDecisionPayload, // Not directly used for typing in this file
  ConfirmPaymentPayload,
} from '../../types';
import { useNavigate } from 'react-router-dom';

type Order = 'asc' | 'desc';

const PAYMENT_METHOD_CHOICES: { value: PaymentMethod; label: string }[] = [
  { value: 'check', label: 'Check' },
  { value: 'ach', label: 'ACH Transfer' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
];

const CheckRequestList: React.FC = () => {
  const { authenticatedFetch, user } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar, showConfirmDialog } = useUI();

  const [checkRequests, setCheckRequests] = useState<CheckRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [totalRequests, setTotalRequests] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [sortConfigKey, setSortConfigKey] = useState<string>('-request_date');
  const [sortConfigDirection, setSortConfigDirection] = useState<Order>('desc');
  const [selectedRequestIds, setSelectedRequestIds] = useState<number[]>([]); // State for selection

  const [selectedRequest, setSelectedRequest] = useState<CheckRequest | null>(
    null,
  );
  const [dialogAction, setDialogAction] = useState<string | null>(null); // 'reject', 'confirm_payment'
  const [actionComments, setActionComments] = useState<string>('');
  const [paymentDetails, setPaymentDetails] = useState<
    Partial<ConfirmPaymentPayload>
  >({
    payment_method: 'check',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: '',
    payment_notes: '',
  });

  const fetchCheckRequests = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    setError(null);
    const params: GetCheckRequestsParams = {
      page: page + 1,
      pageSize: rowsPerPage,
      ordering: `${sortConfigDirection === 'desc' ? '-' : ''}${sortConfigKey}`,
    };
    try {
      const response = await getCheckRequests(authenticatedFetch, params);
      setCheckRequests(response.results);
      setTotalRequests(response.count);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      showSnackbar(`Error fetching check requests: ${msg}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [
    authenticatedFetch,
    page,
    rowsPerPage,
    sortConfigKey,
    sortConfigDirection,
    showSnackbar,
  ]);

  useEffect(() => {
    fetchCheckRequests();
  }, [fetchCheckRequests]);

  const handlePageChange = (_event: unknown, newPage: number) =>
    setPage(newPage);
  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const handleSortRequest = (property: string) => {
    const isAsc = sortConfigKey === property && sortConfigDirection === 'asc';
    setSortConfigDirection(isAsc ? 'desc' : 'asc');
    setSortConfigKey(property);
  };

  const handleAction = async (
    actionFn: () => Promise<unknown>,
    successMessage: string,
    errorMessagePrefix: string,
  ) => {
    setIsLoading(true); // Or a specific action loading state
    try {
      await actionFn();
      showSnackbar(successMessage, 'success');
      fetchCheckRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      showSnackbar(`${errorMessagePrefix}: ${msg}`, 'error');
    } finally {
      setIsLoading(false);
      setDialogAction(null);
      setSelectedRequest(null);
    }
  };

  const handleSubmitForApproval = (id: number) =>
    handleAction(
      () => submitCheckRequestForApproval(authenticatedFetch, id),
      'Request submitted for approval!',
      'Submission failed',
    );
  const handleAccountsApprove = (id: number) =>
    handleAction(
      () =>
        approveCheckRequestByAccounts(authenticatedFetch, id, {
          comments: actionComments,
        }),
      'Request approved by accounts!',
      'Approval failed',
    );
  const handleAccountsReject = (id: number) =>
    handleAction(
      () =>
        rejectCheckRequestByAccounts(authenticatedFetch, id, {
          comments: actionComments || 'Rejected by accounts.',
        }),
      'Request rejected by accounts!',
      'Rejection failed',
    );
  const handleMarkPaymentProcessing = (id: number) =>
    handleAction(
      () => markCheckRequestPaymentProcessing(authenticatedFetch, id),
      'Request marked as payment processing!',
      'Update failed',
    );
  const handleConfirmPaymentSubmit = (id: number) =>
    handleAction(
      () =>
        confirmCheckRequestPayment(
          authenticatedFetch,
          id,
          paymentDetails as ConfirmPaymentPayload,
        ),
      'Payment confirmed!',
      'Payment confirmation failed',
    );
  const handleCancel = (id: number) =>
    handleAction(
      () => cancelCheckRequest(authenticatedFetch, id),
      'Request cancelled!',
      'Cancellation failed',
    );

  const openDialog = (req: CheckRequest, action: string) => {
    setSelectedRequest(req);
    setDialogAction(action);
    if (action === 'reject') setActionComments('');
    if (action === 'confirm_payment')
      setPaymentDetails({
        payment_method: 'check',
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: '',
        payment_notes: '',
      });
  };
  const closeDialog = () => {
    setDialogAction(null);
    setSelectedRequest(null);
  };

  const getStatusChipColor = (status: CheckRequestStatus) => {
    const mapping: Record<
      CheckRequestStatus,
      | 'default'
      | 'primary'
      | 'secondary'
      | 'error'
      | 'info'
      | 'success'
      | 'warning'
    > = {
      pending_submission: 'default',
      pending_approval: 'warning',
      approved: 'success',
      rejected: 'error',
      payment_processing: 'info',
      paid: 'primary', // Or a final success color
      cancelled: 'default',
    };
    return mapping[status] || 'default';
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelectedIds = checkRequests.map((req) => req.id);
      setSelectedRequestIds(newSelectedIds);
      return;
    }
    setSelectedRequestIds([]);
  };

  const handleRowCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    id: number,
  ) => {
    if (event.target.checked) {
      setSelectedRequestIds((prevSelected) => [...prevSelected, id]);
    } else {
      setSelectedRequestIds((prevSelected) =>
        prevSelected.filter((reqId) => reqId !== id),
      );
    }
  };

  const handlePrintSelected = (autoPrint: boolean) => {
    if (selectedRequestIds.length === 0) {
      showSnackbar('Please select check requests to print.', 'warning');
      return;
    }
    // The CheckRequestPrintView expects `checkRequestId` for single,
    // or `selectedCheckRequestIds` (if adapted for multiple)
    // For this list view, we'll always pass an array of IDs.
    navigate('/procurement/check-requests/print-preview', {
      state: {
        selectedCheckRequestIds: selectedRequestIds,
        autoPrint: autoPrint,
      },
    });
  };

  const headCells: {
    id: keyof CheckRequest | string;
    label: string;
    sortable: boolean;
    numeric?: boolean;
    padding?: 'none' | 'normal';
  }[] = [
    { id: 'select', label: '', sortable: false, padding: 'none' },
    { id: 'id', label: 'Req. ID', sortable: true },
    { id: 'purchase_order_number', label: 'PO #', sortable: true },
    { id: 'payee_name', label: 'Payee', sortable: true },
    { id: 'amount', label: 'Amount', sortable: true, numeric: true },
    { id: 'status', label: 'Status', sortable: true },
    { id: 'request_date', label: 'Request Date', sortable: true },
    { id: 'requested_by_username', label: 'Requested By', sortable: true },
    { id: 'actions', label: 'Actions', sortable: false, numeric: true },
  ];

  // Determine if current user is staff (simplified)
  const isStaffUser = !!user?.is_staff;

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Check Requests
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/procurement/check-requests/new')}
        >
          Create New Check Request
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => handlePrintSelected(false)}
          disabled={selectedRequestIds.length === 0}
        >
          Print Preview Selected ({selectedRequestIds.length})
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => handlePrintSelected(true)}
          disabled={selectedRequestIds.length === 0}
        >
          Print Selected ({selectedRequestIds.length})
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedRequestIds.length > 0 &&
                    selectedRequestIds.length < checkRequests.length
                  }
                  checked={
                    checkRequests.length > 0 &&
                    selectedRequestIds.length === checkRequests.length
                  }
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all check requests' }}
                />
              </TableCell>
              {headCells.slice(1).map(
                (
                  hc, // Slice to skip 'select' cell for mapping actual headers
                ) => (
                  <TableCell
                    key={hc.id}
                    align={hc.numeric ? 'right' : 'left'}
                    padding={hc.padding === 'none' ? 'none' : 'normal'}
                    sortDirection={
                      sortConfigKey === hc.id ? sortConfigDirection : false
                    }
                  >
                    {hc.sortable ? (
                      <TableSortLabel
                        active={sortConfigKey === hc.id}
                        direction={
                          sortConfigKey === hc.id ? sortConfigDirection : 'asc'
                        }
                        onClick={() => handleSortRequest(hc.id)}
                      >
                        {hc.label}
                      </TableSortLabel>
                    ) : (
                      hc.label
                    )}
                  </TableCell>
                ),
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && checkRequests.length === 0 && (
              <TableRow>
                <TableCell colSpan={headCells.length + 1} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && checkRequests.length === 0 && (
              <TableRow>
                <TableCell colSpan={headCells.length + 1} align="center">
                  No check requests found.
                </TableCell>
              </TableRow>
            )}
            {checkRequests.map((req) => {
              const isSelected = selectedRequestIds.includes(req.id);
              return (
                <TableRow
                  key={req.id}
                  hover
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={-1}
                  selected={isSelected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(event) =>
                        handleRowCheckboxChange(event, req.id)
                      }
                      inputProps={{
                        'aria-labelledby': `cr-checkbox-${req.id}`,
                      }}
                    />
                  </TableCell>
                  <TableCell
                    id={`cr-checkbox-${req.id}`}
                  >{`CR-${req.id}`}</TableCell>
                  <TableCell>{req.purchase_order_number || '-'}</TableCell>
                  <TableCell>{req.payee_name}</TableCell>
                  <TableCell align="right">
                    ${Number(req.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={req.status.replace(/_/g, ' ')}
                      color={getStatusChipColor(req.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(req.request_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{req.requested_by_username}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton
                        onClick={() =>
                          navigate(`/procurement/check-requests/view/${req.id}`)
                        }
                        size="small"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    {req.status === 'pending_submission' &&
                      (req.requested_by === user?.id || isStaffUser) && (
                        <Tooltip title="Edit">
                          <IconButton
                            onClick={() =>
                              navigate(
                                `/procurement/check-requests/edit/${req.id}`,
                              )
                            }
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    {req.status === 'pending_submission' &&
                      (req.requested_by === user?.id || isStaffUser) && (
                        <Tooltip title="Submit for Approval">
                          <IconButton
                            onClick={() => handleSubmitForApproval(req.id)}
                            size="small"
                            color="primary"
                          >
                            <SendIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    {req.status === 'pending_approval' && isStaffUser && (
                      <Tooltip title="Approve">
                        <IconButton
                          onClick={() => openDialog(req, 'approve')}
                          size="small"
                          color="success"
                        >
                          <ThumbUpAltIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {req.status === 'pending_approval' && isStaffUser && (
                      <Tooltip title="Reject">
                        <IconButton
                          onClick={() => openDialog(req, 'reject')}
                          size="small"
                          color="error"
                        >
                          <ThumbDownAltIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {req.status === 'approved' && isStaffUser && (
                      <Tooltip title="Mark Payment Processing">
                        <IconButton
                          onClick={() => handleMarkPaymentProcessing(req.id)}
                          size="small"
                          color="info"
                        >
                          <PaymentsIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(req.status === 'approved' ||
                      req.status === 'payment_processing') &&
                      isStaffUser && (
                        <Tooltip title="Confirm Payment">
                          <IconButton
                            onClick={() => openDialog(req, 'confirm_payment')}
                            size="small"
                            color="primary"
                          >
                            <PriceCheckIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    {(req.status === 'pending_submission' ||
                      req.status === 'pending_approval') &&
                      (req.requested_by === user?.id || isStaffUser) && (
                        <Tooltip title="Cancel Request">
                          <IconButton
                            onClick={() =>
                              showConfirmDialog(
                                'Confirm Cancel',
                                'Are you sure you want to cancel this check request?',
                                () => handleCancel(req.id),
                              )
                            }
                            size="small"
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalRequests}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </TableContainer>

      {/* Dialog for Reject and Approve (with comments) / Confirm Payment */}
      <Dialog
        open={!!dialogAction}
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogAction === 'reject'
            ? 'Reject Check Request'
            : dialogAction === 'approve'
              ? 'Approve Check Request'
              : 'Confirm Payment'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedRequest &&
              `For Check Request CR-${selectedRequest.id} to ${selectedRequest.payee_name} for $${Number(selectedRequest.amount).toFixed(2)}.`}
            {(dialogAction === 'reject' || dialogAction === 'approve') &&
              ' Please provide comments for your decision.'}
            {dialogAction === 'confirm_payment' &&
              ' Please provide payment details.'}
          </DialogContentText>
          {(dialogAction === 'reject' || dialogAction === 'approve') && (
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
              value={actionComments}
              onChange={(e) => setActionComments(e.target.value)}
            />
          )}
          {dialogAction === 'confirm_payment' && selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth margin="dense">
                <InputLabel id="payment-method-label">
                  Payment Method
                </InputLabel>
                <Select
                  labelId="payment-method-label"
                  value={paymentDetails.payment_method || 'check'}
                  label="Payment Method"
                  onChange={(e) =>
                    setPaymentDetails((prev) => ({
                      ...prev,
                      payment_method: e.target.value as PaymentMethod,
                    }))
                  }
                >
                  {PAYMENT_METHOD_CHOICES.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                margin="dense"
                name="payment_date"
                label="Payment Date"
                type="date"
                fullWidth
                variant="outlined"
                value={paymentDetails.payment_date}
                onChange={(e) =>
                  setPaymentDetails((prev) => ({
                    ...prev,
                    payment_date: e.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                margin="dense"
                name="transaction_id"
                label="Transaction ID / Check #"
                type="text"
                fullWidth
                variant="outlined"
                value={paymentDetails.transaction_id}
                onChange={(e) =>
                  setPaymentDetails((prev) => ({
                    ...prev,
                    transaction_id: e.target.value,
                  }))
                }
                required
              />
              <TextField
                margin="dense"
                name="payment_notes"
                label="Payment Notes (Optional)"
                type="text"
                fullWidth
                multiline
                rows={2}
                variant="outlined"
                value={paymentDetails.payment_notes}
                onChange={(e) =>
                  setPaymentDetails((prev) => ({
                    ...prev,
                    payment_notes: e.target.value,
                  }))
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          {dialogAction === 'reject' && (
            <Button
              onClick={() => handleAccountsReject(selectedRequest!.id)}
              variant="contained"
              color="error"
            >
              Confirm Rejection
            </Button>
          )}
          {dialogAction === 'approve' && (
            <Button
              onClick={() => handleAccountsApprove(selectedRequest!.id)}
              variant="contained"
              color="success"
            >
              Confirm Approval
            </Button>
          )}
          {dialogAction === 'confirm_payment' && (
            <Button
              onClick={() => handleConfirmPaymentSubmit(selectedRequest!.id)}
              variant="contained"
              color="primary"
            >
              Confirm Payment
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CheckRequestList;
