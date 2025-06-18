import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Grid, Autocomplete, CircularProgress, Chip,
  Box, Typography, List, ListItem, ListItemText, Divider, Alert
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { formatISO } from 'date-fns';

import type {
    ChangeRequest, NewChangeRequestData, ChangeType, ChangeStatus, ChangeImpact
} from '../types';
import {
    ChangeTypeOptions, ChangeStatusOptions, ChangeImpactOptions
} from '../types';
import type { ConfigurationItem } from '../../configs/types';
import { getConfigItems } from '../../configs/api';
import { getUserList } from '../../../api/authApi';
import type { User } from '../../../types/UserTypes';
import { useAuth } from '../../../context/auth/useAuth';
import { getApprovalRequests } from '../../workflows/api/workflowApi';
import type { ApprovalRequest, ApprovalStep } from '../../workflows/types/WorkflowTypes';

// Placeholder - Replace with actual ContentType ID for ChangeRequest model
const CHANGES_CONTENT_TYPE_ID = 123;

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
  const { authenticatedFetch } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [changeType, setChangeType] = useState<ChangeType>(ChangeTypeOptions[0]);
  const [status, setStatus] = useState<ChangeStatus>(ChangeStatusOptions[0]);
  const [impact, setImpact] = useState<ChangeImpact>(ChangeImpactOptions[1]);
  const [justification, setJustification] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState<Date | null>(null);
  const [plannedEndDate, setPlannedEndDate] = useState<Date | null>(null);
  const [assignedTo, setAssignedTo] = useState<User | null>(null);
  const [affectedCIs, setAffectedCIs] = useState<ConfigurationItem[]>([]);
  const [rollbackPlan, setRollbackPlan] = useState('');

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [availableCIs, setAvailableCIs] = useState<ConfigurationItem[]>([]);
  const [loadingCIs, setLoadingCIs] = useState<boolean>(false);

  const [approvalDetails, setApprovalDetails] = useState<ApprovalRequest[] | null>(null);
  const [loadingApprovals, setLoadingApprovals] = useState<boolean>(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const fetchDropdownData = async () => {
        if (!authenticatedFetch) return;
        setLoadingUsers(true);
        setLoadingCIs(true);
        try {
          const [usersData, cisData] = await Promise.all([
            getUserList(authenticatedFetch),
            getConfigItems(),
          ]);
          setAvailableUsers(usersData);
          setAvailableCIs(cisData);
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
      setApprovalDetails(null); // Reset approvals when initialData changes
      setApprovalError(null);
    } else {
      setTitle('');
      setDescription('');
      setChangeType(ChangeTypeOptions[0]);
      setStatus(ChangeStatusOptions[0]);
      setImpact(ChangeImpactOptions[1]);
      setJustification('');
      setPlannedStartDate(null);
      setPlannedEndDate(null);
      setAssignedTo(null);
      setAffectedCIs([]);
      setRollbackPlan('');
      setApprovalDetails(null); // Reset on form close/reset
      setApprovalError(null);
    }
  }, [initialData, open, availableUsers, availableCIs]);

  useEffect(() => {
    if (open && initialData?.id) {
      const fetchApprovals = async () => {
        if (!authenticatedFetch) return;
        setLoadingApprovals(true);
        setApprovalError(null);
        try {
          // Corrected: Pass authenticatedFetch to getApprovalRequests
          const approvals = await getApprovalRequests(authenticatedFetch, {
            content_type: CHANGES_CONTENT_TYPE_ID,
            object_id: initialData.id,
          });
          setApprovalDetails(approvals);
        } catch (error) {
          console.error("Failed to fetch approval details", error);
          setApprovalError(error instanceof Error ? error.message : "An unknown error occurred while fetching approvals.");
        } finally {
          setLoadingApprovals(false);
        }
      };
      fetchApprovals();
    } else {
      // Clear approval details if the form is closed, or there's no initialData
      setApprovalDetails(null);
      setApprovalError(null);
      setLoadingApprovals(false);
    }
    // Cleanup function
    return () => {
      setApprovalDetails(null);
      setApprovalError(null);
      setLoadingApprovals(false);
    };
  }, [open, initialData, authenticatedFetch]);

  const handleSubmit = async () => {
    if (!plannedStartDate || !plannedEndDate) {
        alert("Planned start and end dates are required.");
        return;
    }
    const changeData: NewChangeRequestData = {
      title,
      description,
      change_type: changeType,
      status: status,
      assigned_to: assignedTo?.id || undefined,
      impact,
      justification: justification || undefined,
      planned_start_date: formatISO(plannedStartDate),
      planned_end_date: formatISO(plannedEndDate),
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

            {initialData?.id && ( // Only show approval section if editing an existing CR
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Approval Status</Typography>
              {loadingApprovals && <CircularProgress size={24} />}
              {approvalError && <Alert severity="error">{approvalError}</Alert>}
              {!loadingApprovals && !approvalError && (!approvalDetails || approvalDetails.length === 0) && (
                <Typography>No approval information found or yet requested for this change.</Typography>
              )}
              {!loadingApprovals && !approvalError && approvalDetails && approvalDetails.length > 0 && (
                approvalDetails.map((approval) => (
                  <Box key={approval.id} sx={{ mb: 2, p: 2, border: '1px solid grey', borderRadius: '4px' }}>
                    <Typography variant="subtitle1">
                      Overall Status: {approval.current_status.charAt(0).toUpperCase() + approval.current_status.slice(1)}
                    </Typography>
                    {approval.current_step && (
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                            Current Step: {approval.current_step.name} (Order: {approval.current_step.order})
                        </Typography>
                    )}
                    {approval.steps && approval.steps.length > 0 ? (
                      <>
                        <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>Approval Steps:</Typography>
                        <List dense disablePadding>
                          {approval.steps.sort((a,b) => a.order - b.order).map((step, index) => (
                            <React.Fragment key={step.id}>
                              <ListItem sx={{ pl: 2 }}>
                                <ListItemText
                                  primaryTypographyProps={{ variant: 'body2' }}
                                  secondaryTypographyProps={{ variant: 'caption' }}
                                  primary={`Step ${step.order}: ${step.name} - Status: ${step.status.charAt(0).toUpperCase() + step.status.slice(1)}`}
                                  secondary={
                                    <>
                                      {`Approver: ${step.approver_username || (step.approver_group_name ? `Group: ${step.approver_group_name}` : 'N/A')}`}
                                      <br />
                                      {`Comments: ${step.comments || 'None'}`}
                                      {step.actioned_at ? ` - Action At: ${new Date(step.actioned_at).toLocaleString()}` : ''}
                                    </>
                                  }
                                />
                              </ListItem>
                              {index < approval.steps.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                          ))}
                        </List>
                      </>
                    ) : (
                      <Typography sx={{mt:1}}>No individual approval steps found for this request.</Typography>
                    )}
                  </Box>
                ))
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
