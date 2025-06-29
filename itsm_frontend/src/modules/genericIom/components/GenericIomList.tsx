import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
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
  // Alert, // Unused import
  TextField, // For filtering
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  FormControlLabel, // For Show Archived Checkbox
  Checkbox, // For Show Archived Checkbox
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
// import DeleteIcon from '@mui/icons-material/Delete'; // Optional: if delete action is added
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import { getGenericIoms, getIomTemplates, archiveGenericIom, unarchiveGenericIom } from '../../../api/genericIomApi'; // Added archive/unarchive
import type { GenericIOM, GetGenericIomsParams, GenericIomStatus } from '../types/genericIomTypes';
import type { IOMTemplate } from '../../iomTemplateAdmin/types/iomTemplateAdminTypes';

type Order = 'asc' | 'desc';
// Define keys for sorting, ensuring they match GenericIOM properties or backend ordering fields
type OrderableGenericIomKey = 'gim_id' | 'subject' | 'iom_template__name' | 'status' | 'created_by__username' | 'created_at';


interface HeadCell {
  id: OrderableGenericIomKey | 'actions';
  label: string;
  numeric: boolean;
  sortable: boolean;
}

const headCells: readonly HeadCell[] = [
  { id: 'gim_id', label: 'IOM ID', numeric: false, sortable: true },
  { id: 'subject', label: 'Subject', numeric: false, sortable: true },
  { id: 'iom_template__name', label: 'Template', numeric: false, sortable: true },
  { id: 'status', label: 'Status', numeric: false, sortable: true },
  { id: 'created_by__username', label: 'Created By', numeric: false, sortable: true },
  { id: 'created_at', label: 'Created At', numeric: false, sortable: true },
  { id: 'actions', label: 'Actions', numeric: false, sortable: false },
];

const statusOptions: GenericIomStatus[] = ['draft', 'pending_approval', 'approved', 'rejected', 'published', 'archived', 'cancelled'];


const GenericIomListComponent: React.FC = () => {
  const { authenticatedFetch, user } = useAuth();
  const { showSnackbar, showConfirmDialog } = useUI();

  const [ioms, setIoms] = useState<GenericIOM[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [error, setError] = useState<string | null>(null); // Unused state variable

  const [totalIoms, setTotalIoms] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderableGenericIomKey>('created_at');

  // Filters
  const [templatesForFilter, setTemplatesForFilter] = useState<IOMTemplate[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<GenericIomStatus | ''>(''); // Explicitly '' for "All non-archived"
  const [filterTemplateId, setFilterTemplateId] = useState<string>('');
  const [showArchived, setShowArchived] = useState<boolean>(false);


  const fetchIoms = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    // setError(null); // setError was removed as error state is unused

    const params: GetGenericIomsParams = {
      page: page + 1,
      pageSize: rowsPerPage,
      ordering: `${order === 'desc' ? '-' : ''}${orderBy}`,
      search: filterSubject || undefined,
      iom_template_id: filterTemplateId ? parseInt(filterTemplateId) : undefined,
      // Adjust status filter based on showArchived
      // If showArchived is true, and no specific status is selected, we might want all (including archived)
      // or specifically only archived. For now, if filterStatus is set, it takes precedence.
      // If filterStatus is empty, and showArchived is true, we fetch 'archived'.
      // If filterStatus is empty, and showArchived is false, we fetch 'all_except_archived'.
    };

    if (filterStatus) {
      params.status = filterStatus;
    } else {
      params.status = showArchived ? 'archived' : 'all_except_archived'; // Custom backend filter value
    }


    try {
      const response = await getGenericIoms(authenticatedFetch, params);
      setIoms(response.results);
      setTotalIoms(response.count);
    } catch (err: unknown) { // Use unknown for error type
      const message = err instanceof Error ? err.message : String(err);
      // setError(message || 'Failed to fetch IOMs.'); // setError was removed
      showSnackbar(`Error fetching IOMs: ${message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, page, rowsPerPage, order, orderBy, filterSubject, filterStatus, filterTemplateId, showSnackbar, showArchived]); // Added showArchived

  const fetchTemplatesForFilterDropdown = useCallback(async () => {
    if(!authenticatedFetch) return;
    try {
        const response = await getIomTemplates(authenticatedFetch, { is_active: true, pageSize: 500});
        setTemplatesForFilter(response.results);
    } catch (err) {
        console.error("Failed to fetch templates for filter:", err);
        showSnackbar("Could not load templates for filtering.", "error");
    }
  }, [authenticatedFetch, showSnackbar]);


  useEffect(() => {
    fetchIoms();
  }, [fetchIoms]);

  useEffect(() => {
    fetchTemplatesForFilterDropdown();
  }, [fetchTemplatesForFilterDropdown]);


  const handleRequestSort = (property: OrderableGenericIomKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusChipColor = (status: GenericIomStatus) => {
    switch (status) {
      case 'draft': return 'default';
      case 'pending_approval': return 'warning';
      case 'approved': return 'info'; // Different from PRM 'approved'
      case 'published': return 'success';
      case 'rejected': return 'error';
      case 'cancelled': return 'default';
      case 'archived': return 'secondary';
      default: return 'default';
    }
  };

  // TODO: Add handleDelete if needed

  const handleArchiveToggle = async (iomToToggle: GenericIOM) => {
    if (!authenticatedFetch) return;
    const action = iomToToggle.status === 'archived' ? unarchiveGenericIom : archiveGenericIom;
    const actionName = iomToToggle.status === 'archived' ? 'unarchived' : 'archived';
    const successMessage = `IOM "${iomToToggle.subject}" ${actionName} successfully.`;
    const errorMessage = `Failed to ${actionName} IOM "${iomToToggle.subject}".`;

    showConfirmDialog(
        `Confirm ${actionName.charAt(0).toUpperCase() + actionName.slice(1)}`,
        `Are you sure you want to ${actionName} the IOM "${iomToToggle.subject}"?`,
        async () => {
            try {
                await action(authenticatedFetch, iomToToggle.id);
                showSnackbar(successMessage, 'success');
                fetchIoms(); // Refresh list
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                showSnackbar(`${errorMessage} ${message}`, 'error');
            }
        }
    );
  };


  return (
    <Paper sx={{ width: '100%', mb: 2 }} elevation={2}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Filter IOMs</Typography>
        <Grid container spacing={2} alignItems="flex-end"> {/* Changed to flex-end for button alignment */}
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Search by Subject/ID"
              variant="outlined"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={showArchived && !filterStatus ? 'archived' : filterStatus} // Reflect 'archived' if showArchived is true and no other status selected
                label="Status"
                onChange={(e: SelectChangeEvent<GenericIomStatus | ''>) => {
                    const newStatus = e.target.value as GenericIomStatus | '';
                    setFilterStatus(newStatus);
                    // If a specific status is chosen, 'showArchived' might become irrelevant or sync with it
                    if (newStatus === 'archived') setShowArchived(true);
                    else if (newStatus !== '') setShowArchived(false);
                }}
              >
                <MenuItem value=""><em>All Active</em></MenuItem> {/* Default to non-archived */}
                {statusOptions.filter(s => s !== 'archived').map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</MenuItem>)}
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="template-filter-label">Template</InputLabel>
              <Select
                labelId="template-filter-label"
                value={filterTemplateId}
                label="Template"
                onChange={(e: SelectChangeEvent<string>) => setFilterTemplateId(e.target.value)}
              >
                <MenuItem value=""><em>All Templates</em></MenuItem>
                {templatesForFilter.map(t => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
                control={
                <Checkbox
                    checked={showArchived}
                    onChange={(e) => {
                        setShowArchived(e.target.checked);
                        if (e.target.checked) { // If showing archived, clear specific status unless it's 'archived'
                            if(filterStatus !== 'archived') setFilterStatus('');
                        } else { // If hiding archived, ensure status filter isn't 'archived'
                            if(filterStatus === 'archived') setFilterStatus('');
                        }
                    }}
                    name="showArchived"
                />
                }
                label="Show Archived"
            />
          </Grid>
        </Grid>
      </Box>
      <TableContainer>
        <Table aria-labelledby="genericIomTable" size="medium">
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
                      onClick={() => handleRequestSort(headCell.id as OrderableGenericIomKey)}
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
            {isLoading && ioms.length === 0 ? (
              <TableRow><TableCell colSpan={headCells.length} align="center"><CircularProgress /></TableCell></TableRow>
            ) : ioms.length === 0 && !isLoading ? (
              <TableRow><TableCell colSpan={headCells.length} align="center">No IOMs found.</TableCell></TableRow>
            ) : (
              ioms.map((iom) => (
                <TableRow hover tabIndex={-1} key={iom.id}>
                  <TableCell>{iom.gim_id || iom.id}</TableCell>
                  <TableCell>{iom.subject}</TableCell>
                  <TableCell>{iom.iom_template_details?.name || iom.iom_template}</TableCell>
                  <TableCell>
                    <Chip
                        label={iom.status_display || iom.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        color={getStatusChipColor(iom.status)}
                        size="small"
                    />
                  </TableCell>
                  <TableCell>{iom.created_by_username || 'N/A'}</TableCell>
                  <TableCell>{new Date(iom.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Tooltip title="View IOM">
                      <IconButton component={RouterLink} to={`/ioms/view/${iom.id}`} size="small">
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    { (iom.status === 'draft' && iom.created_by === user?.id) || user?.is_staff ? ( // Example edit condition
                      <Tooltip title="Edit IOM">
                        <IconButton component={RouterLink} to={`/ioms/edit/${iom.id}`} size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {/* Archive/Unarchive Button */}
                    {iom.status !== 'archived' &&
                     (iom.status === 'published' || iom.status === 'cancelled' || iom.status === 'rejected' || iom.status === 'approved' || user?.is_staff) && ( // Archivable states
                      <Tooltip title="Archive IOM">
                        <IconButton onClick={() => handleArchiveToggle(iom)} size="small" color="warning">
                          <ArchiveIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {iom.status === 'archived' && (user?.is_staff || iom.created_by === user?.id) && ( // Unarchivable by owner or staff
                      <Tooltip title="Unarchive IOM">
                        <IconButton onClick={() => handleArchiveToggle(iom)} size="small" color="info">
                          <UnarchiveIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalIoms}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default GenericIomListComponent;
