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
  // Dialog for delete confirmation will be handled by useUI context
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI'; // For confirmations and snackbars
import { getIomTemplates, deleteIomTemplate } from '../../../api/genericIomApi'; // API functions
import type { IOMTemplate, GetIomTemplatesParams } from '../types/iomTemplateAdminTypes'; // Types

type Order = 'asc' | 'desc';
type HeadCellId = keyof IOMTemplate | 'actions'; // Add 'actions' for the actions column

interface HeadCell {
  id: HeadCellId;
  label: string;
  numeric: boolean;
  sortable: boolean;
}

const headCells: readonly HeadCell[] = [
  { id: 'name', label: 'Template Name', numeric: false, sortable: true },
  { id: 'category_name', label: 'Category', numeric: false, sortable: true }, // Sort by category.name if API supports
  { id: 'approval_type', label: 'Approval Type', numeric: false, sortable: true },
  { id: 'is_active', label: 'Status', numeric: false, sortable: true },
  { id: 'created_by_username', label: 'Created By', numeric: false, sortable: true },
  { id: 'created_at', label: 'Created At', numeric: false, sortable: true },
  { id: 'actions', label: 'Actions', numeric: false, sortable: false },
];


const IomTemplateListComponent: React.FC = () => {
  const { authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar, showConfirmDialog } = useUI();

  const [templates, setTemplates] = useState<IOMTemplate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [totalTemplates, setTotalTemplates] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof IOMTemplate>('name'); // Default sort by name

  const fetchTemplates = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    setError(null);

    const params: GetIomTemplatesParams = {
      page: page + 1, // API is 1-indexed for page
      pageSize: rowsPerPage,
      ordering: `${order === 'desc' ? '-' : ''}${orderBy}`,
      // TODO: Add filter params here when filter UI is implemented
    };

    try {
      const response = await getIomTemplates(authenticatedFetch, params);
      setTemplates(response.results);
      setTotalTemplates(response.count);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to fetch IOM templates.');
      showSnackbar(`Error fetching templates: ${message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, page, rowsPerPage, order, orderBy, showSnackbar]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleRequestSort = (property: keyof IOMTemplate) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page
  };

  const handleDeleteTemplate = (templateId: number, templateName: string) => {
    showConfirmDialog(
      'Confirm Delete',
      `Are you sure you want to delete the IOM template "${templateName}"? This action cannot be undone.`,
      async () => {
        if (!authenticatedFetch) return;
        try {
          await deleteIomTemplate(authenticatedFetch, templateId);
          showSnackbar(`Template "${templateName}" deleted successfully.`, 'success');
          fetchTemplates(); // Refresh the list
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          showSnackbar(`Error deleting template: ${message}`, 'error');
        }
      }
    );
  };

  const getStatusChip = (isActive: boolean) => {
    return isActive
      ? <Chip label="Active" color="success" size="small" />
      : <Chip label="Inactive" color="default" size="small" />;
  };

  if (isLoading && templates.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading templates...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Paper sx={{ width: '100%', mb: 2 }} elevation={2}>
      <TableContainer>
        <Table aria-labelledby="iomTemplateTable" size="medium">
          <TableHead>
            <TableRow>
              {headCells.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  align={headCell.numeric ? 'right' : 'left'}
                  padding="normal"
                  sortDirection={orderBy === headCell.id ? order : false}
                >
                  {headCell.sortable ? (
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={() => handleRequestSort(headCell.id as keyof IOMTemplate)}
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
            {templates.map((template) => (
              <TableRow hover tabIndex={-1} key={template.id}>
                <TableCell>{template.name}</TableCell>
                <TableCell>{template.category_name || 'N/A'}</TableCell>
                <TableCell>{template.approval_type.charAt(0).toUpperCase() + template.approval_type.slice(1)}</TableCell>
                <TableCell>{getStatusChip(template.is_active)}</TableCell>
                <TableCell>{template.created_by_username || 'N/A'}</TableCell>
                <TableCell>{new Date(template.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Tooltip title="Edit Template">
                    <IconButton
                      component={RouterLink}
                      to={`/admin/iom-templates/edit/${template.id}`}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Template">
                    <IconButton
                      onClick={() => handleDeleteTemplate(template.id, template.name)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {templates.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={headCells.length} align="center">
                  No IOM templates found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalTemplates}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default IomTemplateListComponent;
