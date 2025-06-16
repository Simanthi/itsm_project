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
  Checkbox, // Import Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit'; // Added EditIcon
import CancelIcon from '@mui/icons-material/CancelOutlined'; // Import CancelIcon
import PrintIcon from '@mui/icons-material/Print'; // Import PrintIcon

import { useAuth } from '../../../../context/auth/useAuth';
import { useUI } from '../../../../context/UIContext/useUI'; // Import useUI
import { getPurchaseOrders, updatePurchaseOrder } from '../../../../api/procurementApi'; // Import updatePurchaseOrder
import type { PurchaseOrder, GetPurchaseOrdersParams, PurchaseOrderStatus } from '../../types';
import { useNavigate } from 'react-router-dom';

type Order = 'asc' | 'desc';

const PurchaseOrderList: React.FC = () => {
  const { authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar, showConfirmDialog } = useUI(); // Destructure showConfirmDialog

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [totalPOs, setTotalPOs] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Initial sort by order_date descending
  const [sortConfigKey, setSortConfigKey] = useState<string>('order_date');
  const [sortConfigDirection, setSortConfigDirection] = useState<Order>('desc');
  const [selectedPoIds, setSelectedPoIds] = useState<number[]>([]);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    setError(null);

    const params: GetPurchaseOrdersParams = {
      page: page + 1,
      pageSize: rowsPerPage,
      ordering: `${sortConfigDirection === 'desc' ? '-' : ''}${sortConfigKey}`,
    };

    try {
      const response = await getPurchaseOrders(authenticatedFetch, params);
      setPurchaseOrders(response.results);
      setTotalPOs(response.count);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to fetch purchase orders.');
      console.error("Failed to fetch purchase orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, page, rowsPerPage, sortConfigKey, sortConfigDirection]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

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

  const handleCreateNewPO = () => {
    navigate('/procurement/purchase-orders/new'); // Updated path
  };

  const handleViewDetails = (poId: number) => {
    navigate(`/procurement/purchase-orders/view/${poId}`); // Navigate to the new detail view
  };

  const handleEditPO = (poId: number) => {
    navigate(`/procurement/purchase-orders/edit/${poId}`);
  };

  const handleCancelPO = async (poId: number) => {
    showConfirmDialog(
      'Confirm Cancellation',
      'Are you sure you want to cancel this purchase order? This action cannot be undone.',
      async () => {
        if (!authenticatedFetch) {
          showSnackbar('Authentication required.', 'error');
          return;
        }
        try {
          await updatePurchaseOrder(authenticatedFetch, poId, { status: 'cancelled' });
          showSnackbar('Purchase Order cancelled successfully!', 'success');
          fetchPurchaseOrders(); // Refresh the list
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to cancel purchase order.';
          showSnackbar(message, 'error');
          console.error("Error cancelling PO:", err);
        }
      }
    );
  };

  const getStatusChipColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft': return 'default';
      case 'pending_approval': return 'warning';
      case 'approved': return 'success';
      case 'partially_received': return 'info';
      case 'fully_received': return 'primary';
      case 'invoiced': return 'secondary';
      case 'paid': return 'success'; // Or a different color like 'primary' if success is for approved
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelectedIds = purchaseOrders.map((po) => po.id);
      setSelectedPoIds(newSelectedIds);
      return;
    }
    setSelectedPoIds([]);
  };

  const handleRowCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, poId: number) => {
    if (event.target.checked) {
      setSelectedPoIds((prevSelected) => [...prevSelected, poId]);
    } else {
      setSelectedPoIds((prevSelected) => prevSelected.filter((id) => id !== poId));
    }
  };

  const handlePrintSelected = (autoPrint: boolean) => {
    if (selectedPoIds.length === 0) {
      showSnackbar('Please select purchase orders to print.', 'warning');
      return;
    }
    navigate('/procurement/purchase-orders/print-preview', {
      state: { selectedPoIds: selectedPoIds, autoPrint: autoPrint }
    });
  };

  const headCells: { id: keyof PurchaseOrder | string; label: string; sortable: boolean; numeric?: boolean; padding?: 'none' | 'normal' }[] = [
    { id: 'select', label: '', sortable: false, padding: 'none' },
    { id: 'po_number', label: 'PO Number', sortable: true },
    { id: 'vendor_details', label: 'Vendor', sortable: true }, // Sorting by vendor.name would be backend: 'vendor__name'
    { id: 'order_date', label: 'Order Date', sortable: true },
    { id: 'status', label: 'Status', sortable: true },
    { id: 'total_amount', label: 'Total Amount', sortable: true, numeric: true },
    { id: 'created_by_username', label: 'Created By', sortable: true },
    { id: 'actions', label: 'Actions', sortable: false, numeric: true },
  ];

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Purchase Orders
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleCreateNewPO}
        sx={{ mb: 2 }}
      >
        Create New PO
      </Button>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={() => handlePrintSelected(false)}
        disabled={selectedPoIds.length === 0}
        sx={{ mb: 2, ml: 1 }}
      >
        Print Preview Selected ({selectedPoIds.length})
      </Button>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={() => handlePrintSelected(true)}
        disabled={selectedPoIds.length === 0}
        sx={{ mb: 2, ml: 1 }}
      >
        Print Selected ({selectedPoIds.length})
      </Button>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedPoIds.length > 0 && selectedPoIds.length < purchaseOrders.length}
                  checked={purchaseOrders.length > 0 && selectedPoIds.length === purchaseOrders.length}
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all purchase orders' }}
                />
              </TableCell>
              {headCells.slice(1).map((headCell) => ( // Slice to skip 'select' cell for mapping actual headers
                <TableCell
                  key={headCell.id}
                  align={headCell.numeric ? 'right' : 'left'}
                  padding={headCell.padding === 'none' ? 'none' : 'normal'}
                  sortDirection={sortConfigKey === headCell.id ? sortConfigDirection : false}
                >
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
            {isLoading && purchaseOrders.length === 0 && (
              <TableRow><TableCell colSpan={headCells.length +1} align="center"><CircularProgress /></TableCell></TableRow>
            )}
            {!isLoading && purchaseOrders.length === 0 && (
              <TableRow><TableCell colSpan={headCells.length +1} align="center">No purchase orders found.</TableCell></TableRow>
            )}
            {purchaseOrders.map((po) => {
              const isSelected = selectedPoIds.includes(po.id);
              return (
              <TableRow
                key={po.id}
                hover
                onClick={(event) => { // Allow clicking anywhere on the row to toggle checkbox if desired, or remove
                  // For now, let's assume checkbox click is enough. If row click is needed:
                  // if (event.target instanceof HTMLTableCellElement && event.target.querySelector('input[type="checkbox"]')) {
                  //   return; // Let checkbox handle its own click
                  // }
                  // handleRowCheckboxChange({ target: { checked: !isSelected } } as React.ChangeEvent<HTMLInputElement>, po.id);
                }}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={-1}
                selected={isSelected}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={(event) => handleRowCheckboxChange(event, po.id)}
                    inputProps={{ 'aria-labelledby': `po-checkbox-${po.id}` }}
                  />
                </TableCell>
                <TableCell id={`po-checkbox-${po.id}`}>{po.po_number}</TableCell>
                <TableCell>{po.vendor_details?.name || '-'}</TableCell>
                <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip
                    label={po.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    color={getStatusChipColor(po.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{po.total_amount != null ? `$${Number(po.total_amount).toFixed(2)}` : '-'}</TableCell>
                <TableCell>{po.created_by_username}</TableCell>
                <TableCell align="right">
                  <Tooltip title="View Details">
                    <IconButton onClick={() => handleViewDetails(po.id)} size="small">
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  {(po.status === 'draft' || po.status === 'pending_approval') && (
                    <Tooltip title="Edit Purchase Order">
                      <IconButton onClick={() => handleEditPO(po.id)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {(po.status === 'draft' || po.status === 'pending_approval' || po.status === 'approved') && (
                    <Tooltip title="Cancel Purchase Order">
                      <IconButton onClick={() => handleCancelPO(po.id)} size="small" color="error">
                        <CancelIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {/* Add other relevant actions like 'Receive Items' based on status and permissions */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalPOs}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </TableContainer>
    </Box>
  );
};

export default PurchaseOrderList;
