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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit'; // Added EditIcon

import { useAuth } from '../../../../context/auth/useAuth';
// import { useUI } from '../../../context/UIContext/useUI'; // Not strictly needed if only snackbar for error/success
import { getPurchaseOrders } from '../../../../api/procurementApi';
import type { PurchaseOrder, GetPurchaseOrdersParams, PurchaseOrderStatus } from '../../types';
import { useNavigate } from 'react-router-dom';

type Order = 'asc' | 'desc';

const PurchaseOrderList: React.FC = () => {
  const { authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  // const { showSnackbar } = useUI(); // If we want to use context-based snackbars

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [totalPOs, setTotalPOs] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Initial sort by order_date descending
  const [sortConfigKey, setSortConfigKey] = useState<string>('order_date');
  const [sortConfigDirection, setSortConfigDirection] = useState<Order>('desc');

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

  const headCells: { id: keyof PurchaseOrder | string; label: string; sortable: boolean; numeric?: boolean }[] = [
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
      <Typography variant="h5" component="h2" gutterBottom>
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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              {headCells.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  align={headCell.numeric ? 'right' : 'left'}
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
              <TableRow><TableCell colSpan={headCells.length} align="center"><CircularProgress /></TableCell></TableRow>
            )}
            {!isLoading && purchaseOrders.length === 0 && (
              <TableRow><TableCell colSpan={headCells.length} align="center">No purchase orders found.</TableCell></TableRow>
            )}
            {purchaseOrders.map((po) => (
              <TableRow key={po.id} hover>
                <TableCell>{po.po_number}</TableCell>
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
                  {/* Add other relevant actions like 'Cancel PO', 'Receive Items' based on status and permissions */}
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
