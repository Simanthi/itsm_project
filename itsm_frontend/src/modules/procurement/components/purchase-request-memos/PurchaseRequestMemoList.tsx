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
  Checkbox, // Import Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit'; // Re-enable EditIcon
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print'; // Import PrintIcon
import CancelIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

import { useAuth } from '../../../../context/auth/useAuth';
import { useUI } from '../../../../context/UIContext/useUI';
import {
  getPurchaseRequestMemos,
  cancelPurchaseRequestMemo,
  decidePurchaseRequestMemo,
} from '../../../../api/procurementApi';
import type {
  PurchaseRequestMemo,
  PurchaseRequestDecisionData,
  GetPurchaseRequestMemosParams,
} from '../../types';
import { useNavigate } from 'react-router-dom';
import { getIomTemplates } from '../../../../api/genericIomApi'; // For fetching the PRM template ID
// import type { IOMTemplate } from '../../../iomTemplateAdmin/types/iomTemplateAdminTypes'; // Type for IOMTemplate - Removed as unused

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

  // Store the raw key, direction is separate
  const [sortConfigKey, setSortConfigKey] = useState<string>('request_date');
  const [sortConfigDirection, setSortConfigDirection] = useState<Order>('desc'); // Default sort by request_date desc
  const [selectedMemoIds, setSelectedMemoIds] = useState<number[]>([]);

  const [openDecisionDialog, setOpenDecisionDialog] = useState<boolean>(false);
  const [selectedMemoForDecision, setSelectedMemoForDecision] =
    useState<PurchaseRequestMemo | null>(null);
  const [decisionType, setDecisionType] = useState<
    'approved' | 'rejected' | null
  >(null);
  const [decisionComments, setDecisionComments] = useState<string>('');
  const [purchaseRequestTemplateId, setPurchaseRequestTemplateId] = useState<number | null>(null);
  const [isFetchingTemplateId, setIsFetchingTemplateId] = useState<boolean>(false);


  const fetchPurchaseRequestTemplateId = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsFetchingTemplateId(true);
    try {
      const response = await getIomTemplates(authenticatedFetch, { name: "Purchase Request", pageSize: 1 });
      if (response.results && response.results.length > 0) {
        setPurchaseRequestTemplateId(response.results[0].id);
      } else {
        showSnackbar("Error: 'Purchase Request' IOM Template not found. Please ensure it's created.", "error");
        console.error("'Purchase Request' IOM Template not found.");
      }
    } catch (err) {
      showSnackbar("Failed to fetch Purchase Request template ID.", "error");
      console.error("Failed to fetch Purchase Request template ID:", err);
    } finally {
      setIsFetchingTemplateId(false);
    }
  }, [authenticatedFetch, showSnackbar]);

  useEffect(() => {
    fetchPurchaseRequestTemplateId();
  }, [fetchPurchaseRequestTemplateId]);

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
      const response = await getPurchaseRequestMemos(
        authenticatedFetch,
        params,
      );
      if (response && response.results) {
        setMemos(response.results);
        setTotalMemos(response.count);
      } else {
        console.error('Received invalid response from getPurchaseRequestMemos:', response);
        setMemos([]);
        setTotalMemos(0);
        setError('Failed to retrieve valid memo data structure.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to fetch purchase requests.');
      console.error('Failed to fetch purchase requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    authenticatedFetch,
    page,
    rowsPerPage,
    sortConfigKey,
    sortConfigDirection,
  ]);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSortRequest = (property: string) => { // property is the raw key e.g. 'iom_id'
    const isCurrentProperty = sortConfigKey === property;
    if (isCurrentProperty) {
      // If it's the current sort column, toggle direction
      setSortConfigDirection(sortConfigDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If it's a new sort column, set key and default to ascending
      setSortConfigKey(property);
      setSortConfigDirection('asc');
    }
  };

  const handleCreateNew = () => {
    if (purchaseRequestTemplateId) {
      navigate(`/ioms/new/form/${purchaseRequestTemplateId}`);
    } else {
      showSnackbar("Cannot create new request: 'Purchase Request' template ID not found.", "error");
      console.error("Attempted to create new PRM without a valid purchaseRequestTemplateId.");
    }
  };

  const handleViewMemoDetails = (memoId: number) => {
    navigate(`/procurement/iom/view/${memoId}`);
  };

  const handleEditMemo = (memoId: number) => {
    navigate(`/procurement/iom/edit/${memoId}`);
  };

  const handleOpenCancelDialog = (memo: PurchaseRequestMemo) => {
    showConfirmDialog(
      'Confirm Cancellation',
      `Are you sure you want to cancel this purchase request for "${memo.item_description.substring(0, 50)}..."?`,
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
      },
    );
  };

  const handleOpenDecisionDialog = (
    memo: PurchaseRequestMemo,
    decision: 'approved' | 'rejected',
  ) => {
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
    if (!authenticatedFetch || !selectedMemoForDecision || !decisionType)
      return;

    setIsLoading(true); // Consider specific loading for this action
    const decisionData: PurchaseRequestDecisionData = {
      decision: decisionType,
      comments: decisionComments,
    };

    try {
      await decidePurchaseRequestMemo(
        authenticatedFetch,
        selectedMemoForDecision.id,
        decisionData,
      );
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
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'po_created':
        return 'info';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelectedIds = memos.map((memo) => memo.id);
      setSelectedMemoIds(newSelectedIds);
      return;
    }
    setSelectedMemoIds([]);
  };

  const handleRowCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    memoId: number,
  ) => {
    if (event.target.checked) {
      setSelectedMemoIds((prevSelected) => [...prevSelected, memoId]);
    } else {
      setSelectedMemoIds((prevSelected) =>
        prevSelected.filter((id) => id !== memoId),
      );
    }
  };

  const handlePrintSelected = (autoPrint: boolean) => {
    if (selectedMemoIds.length === 0) {
      showSnackbar('Please select IOMs to print.', 'warning');
      return;
    }
    navigate('/procurement/iom/print-preview', {
      state: { selectedMemoIds: selectedMemoIds, autoPrint: autoPrint },
    });
  };

  const headCells: {
    id: keyof PurchaseRequestMemo | string;
    label: string;
    sortable: boolean;
    padding?: 'none' | 'normal';
  }[] = [
    { id: 'select', label: '', sortable: false, padding: 'none' },
    { id: 'iom_id', label: 'IOM ID', sortable: true },
    { id: 'item_description', label: 'Item Description', sortable: true },
    { id: 'priority', label: 'Priority', sortable: true },
    { id: 'department_name', label: 'Department', sortable: false }, // Not directly sortable if from related field string
    { id: 'requested_by_username', label: 'Requested By', sortable: true },
    { id: 'request_date', label: 'Request Date', sortable: true },
    { id: 'status', label: 'Status', sortable: true },
    { id: 'estimated_cost', label: 'Est. Cost', sortable: true },
    { id: 'actions', label: 'Actions', sortable: false },
  ];

  // Basic permission check examples (replace with actual role/permission logic)
  // const canApprove = user?.is_staff || user?.is_superuser; // Example
  // const isRequester = (memoUser: number) => user?.id === memoUser;

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Internal Office Memo
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleCreateNew}
        sx={{ mb: 2 }}
        disabled={isFetchingTemplateId || !purchaseRequestTemplateId}
      >
        {isFetchingTemplateId ? "Loading Template..." : "Create New Request"}
      </Button>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={() => handlePrintSelected(false)}
        disabled={selectedMemoIds.length === 0}
        sx={{ mb: 2, ml: 1 }}
      >
        Print Preview Selected ({selectedMemoIds.length})
      </Button>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={() => handlePrintSelected(true)}
        disabled={selectedMemoIds.length === 0}
        sx={{ mb: 2, ml: 1 }}
      >
        Print Selected ({selectedMemoIds.length})
      </Button>

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
                    selectedMemoIds.length > 0 &&
                    selectedMemoIds.length < memos.length
                  }
                  checked={
                    memos.length > 0 && selectedMemoIds.length === memos.length
                  }
                  onChange={handleSelectAllClick}
                  inputProps={{
                    'aria-label': 'select all purchase request memos',
                  }}
                />
              </TableCell>
              {headCells.slice(1).map(
                (
                  headCell, // Slice to skip 'select' cell
                ) => (
                  <TableCell
                    key={String(headCell.id)}
                    sortDirection={
                      sortConfigKey === headCell.id
                        ? sortConfigDirection
                        : false
                    }
                    padding={headCell.padding === 'none' ? 'none' : 'normal'}
                  >
                    {headCell.sortable ? (
                      <TableSortLabel
                        active={sortConfigKey === headCell.id}
                        direction={
                          sortConfigKey === headCell.id
                            ? sortConfigDirection
                            : 'asc'
                        }
                        onClick={() => handleSortRequest(String(headCell.id))} // Ensure String cast here
                      >
                        {headCell.label}
                      </TableSortLabel>
                    ) : (
                      headCell.label
                    )}
                  </TableCell>
                ),
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && memos.length === 0 && (
              <TableRow>
                <TableCell colSpan={headCells.length + 1} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && memos.length === 0 && (
              <TableRow>
                <TableCell colSpan={headCells.length + 1} align="center">
                  No purchase requests found.
                </TableCell>
              </TableRow>
            )}
            {memos.map((memo) => {
              const isSelected = selectedMemoIds.includes(memo.id);
              return (
                <TableRow
                  key={memo.id}
                  hover
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={-1}
                  selected={isSelected}
                ><TableCell padding="checkbox"><Checkbox
                      checked={isSelected}
                      onChange={(event) =>
                        handleRowCheckboxChange(event, memo.id)
                      }
                      inputProps={{
                        'aria-label': `Select memo ${memo.iom_id || memo.id}`,
                      }}
                    /></TableCell><TableCell>{memo.iom_id || memo.id}</TableCell><TableCell
                    sx={{
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  ><Tooltip title={memo.item_description}><span>{memo.item_description}</span></Tooltip></TableCell><TableCell><Chip label={memo.priority?.toUpperCase()} size="small"
                          color={memo.priority === 'high' ? 'error' : memo.priority === 'medium' ? 'warning' : 'default'}
                    /></TableCell><TableCell>{memo.department_name || '-'}</TableCell><TableCell>{memo.requested_by_username}</TableCell><TableCell>{new Date(memo.request_date).toLocaleDateString()}</TableCell><TableCell><Chip
                      label={memo.status
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                      color={getStatusChipColor(memo.status)}
                      size="small"
                    /></TableCell><TableCell>{memo.estimated_cost != null
                      ? `$${Number(memo.estimated_cost).toFixed(2)}`
                      : '-'}</TableCell><TableCell align="right"><Tooltip title="View Details"><IconButton
                        onClick={() => handleViewMemoDetails(memo.id)}
                        size="small"
                      ><VisibilityIcon /></IconButton></Tooltip>{memo.status === 'pending' &&
                      (user?.id === memo.requested_by || !!user?.is_staff) && (
                        <Tooltip title="Edit Memo"><IconButton
                            onClick={() => handleEditMemo(memo.id)}
                            size="small"
                          ><EditIcon /></IconButton></Tooltip>
                      )}{memo.status === 'pending' &&
                      (user?.id === memo.requested_by || !!user?.is_staff) && (
                        <Tooltip title="Cancel Request"><IconButton
                            onClick={() => handleOpenCancelDialog(memo)}
                            size="small"
                            color="warning"
                          ><CancelIcon /></IconButton></Tooltip>
                      )}{memo.status === 'pending' && !!user?.is_staff && (
                      <><Tooltip title="Approve Request"><IconButton
                            onClick={() =>
                              handleOpenDecisionDialog(memo, 'approved')
                            }
                            size="small"
                            color="success"
                          ><CheckCircleOutlineIcon /></IconButton></Tooltip><Tooltip title="Reject Request"><IconButton
                            onClick={() =>
                              handleOpenDecisionDialog(memo, 'rejected')
                            }
                            size="small"
                            color="error"
                          ><HighlightOffIcon /></IconButton></Tooltip></>
                    )}</TableCell></TableRow>
              );
            })}
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
      <Dialog
        open={openDecisionDialog}
        onClose={handleCloseDecisionDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {decisionType === 'approved' ? 'Approve' : 'Reject'} Purchase Request:{' '}
          {selectedMemoForDecision?.item_description.substring(0, 30)}...
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please provide comments for your decision (optional for approval,
            recommended for rejection).
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
          <Button
            onClick={handleConfirmDecision}
            variant="contained"
            color={decisionType === 'approved' ? 'success' : 'error'}
          >
            Confirm {decisionType === 'approved' ? 'Approval' : 'Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseRequestMemoList;
