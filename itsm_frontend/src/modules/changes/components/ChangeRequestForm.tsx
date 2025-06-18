import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Grid, Autocomplete, CircularProgress, Chip
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { formatISO } from 'date-fns'; // To format dates to ISO string for backend

import {
    ChangeRequest, NewChangeRequestData, ChangeType, ChangeStatus, ChangeImpact,
    ChangeTypeOptions, ChangeStatusOptions, ChangeImpactOptions
} from '../types';
import { ConfigurationItem } from '../../configs/types';
import { getConfigItems } from '../../configs/api'; // To fetch CIs
import { UserLite, getUsersLite } from '../../../api/authApi'; // Assuming a lite version for users
import { useAuth } from '../../../context/auth/useAuth';
import { ApprovalRequest } from '../../workflows/types'; // Import workflow types
import { getApprovalRequests } from '../../workflows/api'; // Import workflow API

interface ChangeRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NewChangeRequestData, id?: number) => Promise<void>;
  initialData?: ChangeRequest | null;
}

const ChangeRequestForm: React.FC<ChangeRequestFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { authenticatedFetch, user: currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [changeType, setChangeType] = useState<ChangeType>(ChangeTypeOptions[0]);
  const [status, setStatus] = useState<ChangeStatus>(ChangeStatusOptions[0]); // Default to 'draft' or 'pending_approval'
  const [impact, setImpact] = useState<ChangeImpact>(ChangeImpactOptions[1]); // Default to 'medium'
  const [justification, setJustification] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState<Date | null>(null);
  const [plannedEndDate, setPlannedEndDate] = useState<Date | null>(null);
  const [assignedTo, setAssignedTo] = useState<UserLite | null>(null);
  const [affectedCIs, setAffectedCIs] = useState<ConfigurationItem[]>([]);
  const [rollbackPlan, setRollbackPlan] = useState('');

  const [availableUsers, setAvailableUsers] = useState<UserLite[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [availableCIs, setAvailableCIs] = useState<ConfigurationItem[]>([]);
  const [loadingCIs, setLoadingCIs] = useState<boolean>(false);

  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [loadingApproval, setLoadingApproval] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      const fetchDropdownData = async () => {
        if (!authenticatedFetch) return;
        setLoadingUsers(true);
        setLoadingCIs(true);
        try {
          const [users, cis] = await Promise.all([
            getUsersLite(authenticatedFetch), // Assumes getUsersLite takes authenticatedFetch
            getConfigItems(), // Assumes getConfigItems is setup with apiClient that uses auth
          ]);
          setAvailableUsers(users);
          setAvailableCIs(cis);
        } catch (error) {
          console.error("Failed to fetch data for Change Request form", error);
        } finally {
          setLoadingUsers(false);
          setLoadingCIs(false);
        }
      };
      fetchDropdownData();
    }
  }, [open, authenticatedFetch]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setChangeType(initialData.change_type);
      setStatus(initialData.status);
      setImpact(initialData.impact);
      setJustification(initialData.justification || '');
      setPlannedStartDate(initialData.planned_start_date ? new Date(initialData.planned_start_date) : null);
      setPlannedEndDate(initialData.planned_end_date ? new Date(initialData.planned_end_date) : null);

      if (initialData.assigned_to && availableUsers.length > 0) {
        setAssignedTo(availableUsers.find(u => u.id === initialData.assigned_to) || null);
      } else {
        setAssignedTo(null);
      }

      if (initialData.affected_cis && initialData.affected_cis.length > 0 && availableCIs.length > 0) {
        setAffectedCIs(availableCIs.filter(ci => initialData.affected_cis.includes(ci.id)));
      } else {
        setAffectedCIs([]);
      }
      setRollbackPlan(initialData.rollback_plan || '');

      // Fetch approval request if editing and status indicates it might exist
      if (initialData.id && (initialData.status === 'pending_approval' || initialData.status === 'approved' || initialData.status === 'rejected')) {
        const fetchApprovalData = async () => {
          setLoadingApproval(true);
          try {
            // Assuming backend has ContentType model name 'changerequest' for ChangeRequest
            // This might need adjustment based on actual ContentType naming in backend
            // For simplicity, this example assumes direct query by object_id if your API supports it broadly,
            // or you might need a specific endpoint or a more complex query.
            // A more robust way would be to have a link to the approval_request_id on the ChangeRequest model itself.
            // Let's assume for now the backend serializer for ChangeRequest might provide approval_request_id or similar.
            // If not, this is a simplified approach:
            const relatedApprovals = await getApprovalRequests({
              // This is a guess, actual filtering might be different.
              // It's better if ChangeRequest serializer provides the approval_request ID or nested object.
              // For now, we'll assume we can find it this way or it's provided in initialData.
              // For this example, let's say initialData.approval_request_id is available.
              // object_id: initialData.id,
              // content_type_model: 'changerequest' // This filter might not exist.
            });
            // Filter for the specific one if multiple returned (e.g. if querying by object_id only)
            // This is highly dependent on your API's filtering capabilities for generic relations.
            // A simpler approach would be to have initialData.approval_details (nested) or initialData.approval_request_id.
            // For this example, we'll mock this part or assume initialData could include basic approval status.
            // Let's assume `initialData` could have a field like `approval_status_display` or nested `approval_request_summary`.
            // For this example, let's just try to find one if an ID is hypothetically on initialData.
            // if (initialData.approval_request_id_placeholder) {
            //    const approval = await getApprovalRequestById(initialData.approval_request_id_placeholder);
            //    setApprovalRequest(approval);
            // }
            // This part is complex without knowing the exact API structure for linking CR to ApprovalRequest.
            // For now, we'll just display what's on initialData.status and assume detailed steps are elsewhere.
          } catch (error) {
            console.error("Failed to fetch approval data for Change Request", error);
          } finally {
            setLoadingApproval(false);
          }
        };
        // fetchApprovalData(); // Call this if you have a way to get the approval_request_id
      }
    } else {
      // Defaults for new Change Request
      setTitle('');
      setDescription('');
      setChangeType(ChangeTypeOptions[0]);
      setStatus(ChangeStatusOptions[0]); // e.g. 'draft'
      setImpact(ChangeImpactOptions[1]); // e.g. 'medium'
      setJustification('');
      setPlannedStartDate(null);
      setPlannedEndDate(null);
      setAssignedTo(null);
      setAffectedCIs([]);
      setRollbackPlan('');
    }
  }, [initialData, open, availableUsers, availableCIs]);

  const handleSubmit = async () => {
    if (!plannedStartDate || !plannedEndDate) {
        // Or show a snackbar error
        alert("Planned start and end dates are required.");
        return;
    }
    const changeData: NewChangeRequestData = {
      title,
      description,
      change_type: changeType,
      status: status, // Backend might override this based on workflow for new changes
      assigned_to: assignedTo?.id || undefined,
      impact,
      justification: justification || undefined,
      planned_start_date: formatISO(plannedStartDate), // Format to ISO string
      planned_end_date: formatISO(plannedEndDate),   // Format to ISO string
      affected_cis: affectedCIs.map(ci => ci.id),
      rollback_plan: rollbackPlan || undefined,
    };
    await onSubmit(changeData, initialData?.id);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>{initialData ? 'Edit Change Request' : 'Create New Change Request'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth required margin="dense" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth required multiline rows={3} margin="dense" />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel>Change Type</InputLabel>
                <Select value={changeType} onChange={(e: SelectChangeEvent<ChangeType>) => setChangeType(e.target.value as ChangeType)} label="Change Type">
                  {ChangeTypeOptions.map(option => <MenuItem key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel>Status</InputLabel>
                <Select value={status} onChange={(e: SelectChangeEvent<ChangeStatus>) => setStatus(e.target.value as ChangeStatus)} label="Status">
                  {ChangeStatusOptions.map(option => <MenuItem key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth margin="dense" required>
                <InputLabel>Impact</InputLabel>
                <Select value={impact} onChange={(e: SelectChangeEvent<ChangeImpact>) => setImpact(e.target.value as ChangeImpact)} label="Impact">
                  {ChangeImpactOptions.map(option => <MenuItem key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Justification" value={justification} onChange={(e) => setJustification(e.target.value)} fullWidth multiline rows={2} margin="dense" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Planned Start Date"
                value={plannedStartDate}
                onChange={setPlannedStartDate}
                slotProps={{ textField: { fullWidth: true, margin: "dense", required: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Planned End Date"
                value={plannedEndDate}
                onChange={setPlannedEndDate}
                slotProps={{ textField: { fullWidth: true, margin: "dense", required: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                  options={availableUsers}
                  getOptionLabel={(option) => `${option.username} (${option.first_name || ''} ${option.last_name || ''})`.trim()}
                  value={assignedTo}
                  onChange={(_event, newValue) => setAssignedTo(newValue)}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  loading={loadingUsers}
                  renderInput={(params) => (
                      <TextField {...params} label="Assigned To (Optional)" margin="dense" InputProps={{
                          ...params.InputProps,
                          endAdornment: (<>{loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>),
                      }}/>
                  )}
              />
            </Grid>
            <Grid item xs={12}>
                <Autocomplete
                    multiple
                    options={availableCIs}
                    getOptionLabel={(option) => `${option.id}: ${option.name} (${option.ci_type})`}
                    value={affectedCIs}
                    onChange={(_event, newValue) => setAffectedCIs(newValue)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    loading={loadingCIs}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                            <Chip variant="outlined" label={`${option.id}: ${option.name}`} {...getTagProps({ index })} />
                        ))
                    }
                    renderInput={(params) => (
                        <TextField {...params} label="Affected CIs (Optional)" margin="dense" InputProps={{
                            ...params.InputProps,
                            endAdornment: (<>{loadingCIs ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>),
                        }}/>
                    )}
                />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Rollback Plan" value={rollbackPlan} onChange={(e) => setRollbackPlan(e.target.value)} fullWidth multiline rows={3} margin="dense" />
            </Grid>

            {initialData && initialData.id && (initialData.status === 'pending_approval' || initialData.status === 'approved' || initialData.status === 'rejected') && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>Approval Status</Typography>
                {loadingApproval ? <CircularProgress size={24} /> :
                  approvalRequest ? (
                  <Box>
                    <Typography><strong>Overall Status:</strong> {approvalRequest.current_status}</Typography>
                    {approvalRequest.steps && approvalRequest.steps.length > 0 && (
                      <Box sx={{mt: 1}}>
                        <Typography variant="subtitle1">Steps:</Typography>
                        {approvalRequest.steps.map(step => (
                          <Paper key={step.id} variant="outlined" sx={{p:1, mt:1}}>
                            <Typography variant="body2">Step {step.step_order}: {step.status}</Typography>
                            <Typography variant="caption">Approver: {step.approver_username || `User ID ${step.approver}`}</Typography>
                            {step.comments && <Typography variant="caption" display="block">Comments: {step.comments}</Typography>}
                            {step.approved_at && <Typography variant="caption" display="block">Action At: {new Date(step.approved_at).toLocaleString()}</Typography>}
                          </Paper>
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Approval details not loaded or not yet requested for status: {initialData.status}.
                  </Typography>
                )}
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {initialData ? 'Save Changes' : 'Create Change Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ChangeRequestForm;
