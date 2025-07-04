import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Added useNavigate
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Chip,
  List, // Added for displaying steps
  ListItem, // Added for displaying steps
  // ListItemText, // Removed unused import
  // ListItemIcon, // Unused
  TextField, // For comments in actions
} from '@mui/material';
// import DescriptionIcon from '@mui/icons-material/Description'; // Unused
// import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // Unused
// import GroupIcon from '@mui/icons-material/Group'; // Unused
// import CalendarTodayIcon from '@mui/icons-material/CalendarToday'; // Unused
// import SubjectIcon from '@mui/icons-material/Subject'; // Unused
// import LabelIcon from '@mui/icons-material/Label'; // Unused
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import PublishIcon from '@mui/icons-material/Publish';
import SendIcon from '@mui/icons-material/Send';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ForwardIcon from '@mui/icons-material/Forward'; // Using as a generic for delegated

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import {
    getGenericIomById,
    submitGenericIomForSimpleApproval,
    simpleApproveGenericIom,
    simpleRejectGenericIom,
    publishGenericIom,
    archiveGenericIom, // Import archive/unarchive
    unarchiveGenericIom
} from '../../../api/genericIomApi';
import { getApprovalSteps, approveApprovalStep, rejectApprovalStep } from '../../../api/procurementApi'; // For advanced approvals
import type { GenericIOM, GenericIomSimpleActionPayload } from '../types/genericIomTypes';
import type { FieldDefinition } from '../../iomTemplateAdmin/types/iomTemplateAdminTypes';
import type { FormFieldValue } from './DynamicIomFormFieldRenderer'; // Import FormFieldValue
import type { ApprovalStep, GetApprovalStepsParams, ApprovalActionPayload } from '../../procurement/types/procurementTypes'; // For advanced approvals

interface GenericIomDetailComponentProps {
  iomId: number;
}

// Helper to display dynamic field values appropriately
const DisplayDynamicFieldValue: React.FC<{field: FieldDefinition, value: FormFieldValue}> = ({ field, value }) => {
    if (value === null || value === undefined || String(value).trim() === '') {
        return <Typography variant="body2" color="textSecondary"><em>Not provided</em></Typography>;
    }
    if (field.type === 'boolean') {
        return <Chip label={value ? 'Yes' : 'No'} size="small" />;
    }
    if (field.type === 'date' && typeof value === 'string') {
        return <Typography variant="body2">{new Date(value).toLocaleDateString()}</Typography>;
    }
    if (field.type === 'datetime' && typeof value === 'string') {
        return <Typography variant="body2">{new Date(value).toLocaleString()}</Typography>;
    }
    if (Array.isArray(value)) {
        return <Typography variant="body2">{value.join(', ')}</Typography>;
    }
    // TODO: Handle selector types by fetching related object names if IDs are stored
    return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap'}}>{String(value)}</Typography>;
};


const GenericIomDetailComponent: React.FC<GenericIomDetailComponentProps> = ({ iomId }) => {
  const { authenticatedFetch, user } = useAuth();
  const { showSnackbar, showConfirmDialog } = useUI();

  const [iom, setIom] = useState<GenericIOM | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string|null>(null);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [comments, setComments] = useState<string>('');

  // State for advanced approval steps
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([]);
  const [isLoadingApprovalSteps, setIsLoadingApprovalSteps] = useState<boolean>(false);
  const [approvalStepsError, setApprovalStepsError] = useState<string | null>(null);

  const navigate = useNavigate(); // For navigating after archive/unarchive

  const fetchIomDetailsAndSteps = useCallback(async () => {
    if (!authenticatedFetch || !iomId) return;
    setIsLoading(true);
    setError(null);
    setApprovalStepsError(null);
    setApprovalSteps([]); // Reset before fetching

    try {
      const fetchedIom = await getGenericIomById(authenticatedFetch, iomId);
      setIom(fetchedIom);

      // If advanced approval, fetch steps
      if (fetchedIom?.iom_template_details?.approval_type === 'advanced') {
        setIsLoadingApprovalSteps(true);
        try {
          const params: GetApprovalStepsParams = {
            content_type_app_label: 'generic_iom',
            content_type_model: 'genericiom', // Ensure this matches backend model name (lowercase)
            object_id: fetchedIom.id,
            pageSize: 100, // Assuming not too many steps per IOM
            ordering: 'step_order', // Order by step_order
          };
          const stepsResponse = await getApprovalSteps(authenticatedFetch, params);
          setApprovalSteps(stepsResponse.results);
        } catch (stepsErr) {
          const stepsMessage = stepsErr instanceof Error ? stepsErr.message : "Could not load approval steps.";
          setApprovalStepsError(stepsMessage);
          showSnackbar(`Error fetching approval steps: ${stepsMessage}`, 'error');
        } finally {
          setIsLoadingApprovalSteps(false);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setError(`Failed to load IOM details: ${message}`);
      showSnackbar(`Error: ${message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, iomId, showSnackbar]);

  useEffect(() => {
    fetchIomDetailsAndSteps();
  }, [fetchIomDetailsAndSteps]);


  const refreshAllData = () => {
    fetchIomDetailsAndSteps();
  }

  const handleSimpleWorkflowAction = async (actionType: 'submit' | 'approve' | 'reject' | 'publish') => {
    if (!iom || !authenticatedFetch) return;

    setIsActionLoading(true);
    setActionError(null);

    const currentComments = comments; // Capture comments at time of action
    // Do not reset comments state here as it's tied to the TextField for approve/reject

    const actionPayload: GenericIomSimpleActionPayload = { comments: currentComments };

    try {
      let updatedIom: GenericIOM | null = null;
      let successMessage = '';

      switch(actionType) {
        case 'submit':
            updatedIom = await submitGenericIomForSimpleApproval(authenticatedFetch, iom.id);
            successMessage = "IOM submitted for simple approval.";
            break;
        case 'approve':
            if (iom.iom_template_details?.approval_type === 'simple') {
                updatedIom = await simpleApproveGenericIom(authenticatedFetch, iom.id, actionPayload);
                successMessage = "IOM simple-approved.";
            }
            break;
        case 'reject':
            if (!currentComments.trim() && iom.iom_template_details?.approval_type === 'simple') {
                showSnackbar("Comments are required for rejection.", "warning");
                setActionError("Comments are required for rejection.");
                setIsActionLoading(false);
                return;
            }
            if (iom.iom_template_details?.approval_type === 'simple') {
                updatedIom = await simpleRejectGenericIom(authenticatedFetch, iom.id, actionPayload);
                successMessage = "IOM simple-rejected.";
            }
            break;
        case 'publish':
            updatedIom = await publishGenericIom(authenticatedFetch, iom.id);
            successMessage = "IOM published successfully.";
            break;
      }

      if (updatedIom) {
        // Instead of just setting IOM, refresh all data to get updated steps and IOM status
        showSnackbar(successMessage, 'success');
        setComments(''); // Clear comments after successful action
        refreshAllData(); // Refresh IOM and its approval steps
      }
    } catch (err: unknown) {
      const errorData = (err as { data?: unknown })?.data || err;
      let errorMessage = `Failed to ${actionType} IOM.`;
      if (typeof errorData === 'object' && errorData !== null) {
        errorMessage = Object.values(errorData).flat().join(' ');
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof errorData === 'string'){
        errorMessage = errorData;
      }
      setActionError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAdvancedApprovalAction = async (stepId: number, action: 'approve' | 'reject') => {
    if (!authenticatedFetch) return;

    const currentStep = approvalSteps.find(s => s.id === stepId);
    if (!currentStep || currentStep.status !== 'pending') {
      showSnackbar("This step cannot be actioned.", "warning");
      return;
    }

    if (action === 'reject' && !comments.trim()) {
      showSnackbar("Comments are required for rejection.", "warning");
      setActionError("Comments are required for rejection."); // Show error near comments field
      return;
    }

    setIsActionLoading(true);
    setActionError(null);
    const payload: ApprovalActionPayload = { comments: comments };

    try {
      if (action === 'approve') {
        await approveApprovalStep(authenticatedFetch, stepId, payload);
        showSnackbar(`Step ${currentStep.step_order} approved successfully.`, 'success');
      } else {
        await rejectApprovalStep(authenticatedFetch, stepId, payload);
        showSnackbar(`Step ${currentStep.step_order} rejected successfully.`, 'success');
      }
      setComments(''); // Clear comments after action
      refreshAllData(); // Refresh IOM and its approval steps
    } catch (err) {
      const errorData = (err as { data?: unknown })?.data || err;
      let errorMessage = `Failed to ${action} step.`;
      if (typeof errorData === 'object' && errorData !== null) {
        errorMessage = Object.values(errorData).flat().join(' ');
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof errorData === 'string'){
        errorMessage = errorData;
      }
      setActionError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsActionLoading(false);
    }
  };


  const handleArchiveToggleAction = async () => {
    if (!iom || !authenticatedFetch) return;

    const isCurrentlyArchived = iom.status === 'archived';
    const apiAction = isCurrentlyArchived ? unarchiveGenericIom : archiveGenericIom;
    const actionName = isCurrentlyArchived ? 'unarchive' : 'archive';

    showConfirmDialog(
        `Confirm ${actionName.charAt(0).toUpperCase() + actionName.slice(1)}`,
        `Are you sure you want to ${actionName} this IOM: "${iom.subject}"?`,
        async () => {
            setIsActionLoading(true);
            setActionError(null);
            try {
                const updatedIom = await apiAction(authenticatedFetch, iom.id);
                setIom(updatedIom);
                showSnackbar(`IOM successfully ${actionName}d.`, 'success');
                if (actionName === 'archive') {
                    // Optionally navigate away if an archived IOM shouldn't be viewed directly,
                    // or just update UI to reflect new status.
                    navigate('/ioms'); // Uncommented navigation
                }
            } catch (err: unknown) { // Changed from any to unknown
                const errorData = (err as { data?: unknown })?.data || err;
                let errorMessage = `Failed to ${actionName} IOM.`;
                if (typeof errorData === 'object' && errorData !== null) {
                    errorMessage = Object.values(errorData).flat().join(' ');
                } else if (err instanceof Error) {
                    errorMessage = err.message;
                } else if (typeof errorData === 'string'){
                    errorMessage = errorData;
                }
                setActionError(errorMessage);
                showSnackbar(errorMessage, 'error');
            } finally {
                setIsActionLoading(false);
            }
        }
    );
  };


  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  if (!iom) {
    return <Alert severity="warning" sx={{ m: 2 }}>IOM details not found.</Alert>;
  }

  const canSubmitForSimpleApproval = iom.status === 'draft' && iom.iom_template_details?.approval_type === 'simple';
  // const canSubmitForSimpleApproval = iom.status === 'draft' && iom.iom_template_details?.approval_type === 'simple'; // Removed duplicate

  const isSimpleApprover = iom.iom_template_details?.approval_type === 'simple' &&
                         (iom.iom_template_details?.simple_approval_user === user?.id ||
                          (user?.groups && iom.iom_template_details?.simple_approval_group &&
                           user.groups.some(g => Number(g) === iom.iom_template_details?.simple_approval_group)));

  const canPerformSimpleApprovalAction = iom.status === 'pending_approval' && isSimpleApprover;

  const canPublish = (iom.status === 'draft' && iom.iom_template_details?.approval_type === 'none') ||
                     (iom.status === 'approved');

  const archivableStatuses: GenericIOM['status'][] = ['published', 'rejected', 'cancelled', 'approved'];
  const canArchive = archivableStatuses.includes(iom.status) && (user?.is_staff || iom.created_by === user?.id);
  const canUnarchive = iom.status === 'archived' && (user?.is_staff || iom.created_by === user?.id);


  return (
    <Box>
      <Grid container spacing={2} sx={{mb: 2}}>
        <Grid item xs={12} md={6}>
          <Typography variant="body1"><strong>IOM ID:</strong> {iom.gim_id}</Typography>
          <Typography variant="body1"><strong>Template:</strong> {iom.iom_template_details?.name || iom.iom_template}</Typography>
          <Typography variant="body1"><strong>Status:</strong> <Chip label={iom.status_display || iom.status} color={iom.status === 'published' ? 'success' : 'default'} size="small" /></Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="body1"><strong>Created By:</strong> {iom.created_by_username || 'N/A'}</Typography>
          <Typography variant="body1"><strong>Created At:</strong> {new Date(iom.created_at).toLocaleString()}</Typography>
          {iom.published_at && <Typography variant="body1"><strong>Published At:</strong> {new Date(iom.published_at).toLocaleString()}</Typography>}
        </Grid>
      </Grid>

      <Divider sx={{my:2}} />

      <Typography variant="h6" gutterBottom>Subject: {iom.subject}</Typography>

      {iom.to_users_details && iom.to_users_details.length > 0 && (
        <Box sx={{mb:1}}>
          <Typography variant="subtitle2" component="span"><strong>To Users: </strong></Typography>
          {iom.to_users_details.map(u => (typeof u === 'object' && u !== null && u.username) ? u.username : (typeof u === 'object' && u !== null && u.id ? u.id : String(u))).join(', ')}
        </Box>
      )}
      {iom.to_groups_details && iom.to_groups_details.length > 0 && (
         <Box sx={{mb:1}}>
            <Typography variant="subtitle2" component="span"><strong>To Groups: </strong></Typography>
            {iom.to_groups_details.map(g => (typeof g === 'object' && g !== null && g.name) ? g.name : (typeof g === 'object' && g !== null && g.id ? g.id : String(g))).join(', ')}
        </Box>
      )}
       {iom.parent_record_display && (
         <Box sx={{mb:1}}>
            <Typography variant="subtitle2" component="span"><strong>Related To: </strong></Typography>
            {iom.parent_record_display}
        </Box>
      )}


      <Typography variant="h6" sx={{mt:3, mb:1}}>Details:</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {iom.iom_template_details?.fields_definition.map((fieldDef) => (
            <Grid item xs={12} md={fieldDef.type === 'text_area' ? 12 : 6} key={fieldDef.name}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">{fieldDef.label}:</Typography>
                <DisplayDynamicFieldValue field={fieldDef} value={iom.data_payload[fieldDef.name] as FormFieldValue} />
              </Box>
            </Grid>
          ))}
          {Object.keys(iom.data_payload).length === 0 && (
            <Grid item xs={12}><Typography>No details provided in payload.</Typography></Grid>
          )}
        </Grid>
      </Paper>

      {/* Workflow Actions Section */}
      <Box sx={{ mt: 3, p:2, border: '1px solid lightgray', borderRadius: 1}}>
        <Typography variant="h6" gutterBottom>Actions</Typography>
        {actionError && <Alert severity="error" sx={{mb:1}}>{actionError}</Alert>}
        <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 1}}>
            {canSubmitForSimpleApproval && (
                <Button onClick={() => handleSimpleWorkflowAction('submit')} variant="contained" startIcon={<SendIcon />} disabled={isActionLoading}>
                    {isActionLoading ? <CircularProgress size={20}/> : "Submit for Simple Approval"}
                </Button>
            )}

            {/* Comments field - shared for simple and advanced approval actions */}
            {(canPerformSimpleApprovalAction || (iom.iom_template_details?.approval_type === 'advanced' && approvalSteps.some(s => s.status === 'pending'))) && (
                 <TextField
                    label="Comments (for Approve/Reject)"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    multiline rows={2} size="small" fullWidth
                    helperText={actionError === "Comments are required for rejection." ? actionError : "Comments required for rejection."}
                    error={actionError === "Comments are required for rejection."}
                    sx={{mt: (canPerformSimpleApprovalAction ? 0 : 1)}} // Add margin top if it's for advanced workflow and no simple action is shown before it
                />
            )}

            {canPerformSimpleApprovalAction && (
                <Paper variant="outlined" sx={{p:1, display: 'flex', flexDirection:'column', gap:1, width: '100%', mt:1 }}>
                    {/* Comment field is now outside this block */}
                    <Box sx={{display:'flex', gap:1}}>
                        <Button onClick={() => handleSimpleWorkflowAction('approve')} variant="outlined" color="success" startIcon={<CheckCircleOutlineIcon />} disabled={isActionLoading}>
                            {isActionLoading ? <CircularProgress size={20}/> : "Simple Approve"}
                        </Button>
                        <Button onClick={() => handleSimpleWorkflowAction('reject')} variant="outlined" color="error" startIcon={<HighlightOffIcon />} disabled={isActionLoading || !comments.trim()}>
                            {isActionLoading ? <CircularProgress size={20}/> : "Simple Reject"}
                        </Button>
                    </Box>
                </Paper>
            )}

            {canPublish && (
                <Button onClick={() => handleSimpleWorkflowAction('publish')} variant="contained" color="primary" startIcon={<PublishIcon />} disabled={isActionLoading}>
                    {isActionLoading ? <CircularProgress size={20}/> : "Publish IOM"}
                </Button>
            )}

            {canArchive && (
                 <Button onClick={handleArchiveToggleAction} variant="outlined" color="warning" startIcon={<ArchiveIcon />} disabled={isActionLoading || iom.status === 'draft'}> {/* Prevent archiving draft */}
                    {isActionLoading ? <CircularProgress size={20}/> : "Archive IOM"}
                </Button>
            )}
            {canUnarchive && (
                 <Button onClick={handleArchiveToggleAction} variant="outlined" color="info" startIcon={<UnarchiveIcon />} disabled={isActionLoading}>
                    {isActionLoading ? <CircularProgress size={20}/> : "Unarchive IOM"}
                </Button>
            )}
        </Box>

        {!(canSubmitForSimpleApproval || canPerformSimpleApprovalAction || canPublish || canArchive || canUnarchive) && (
            <Typography color="textSecondary">No actions available for this IOM in its current state or based on your permissions.</Typography>
        )}
      </Box>

      {/* Placeholder for Advanced Approval Steps Display */}
      {iom.iom_template_details?.approval_type === 'advanced' && (
        <Box sx={{mt:3, p:2, border: '1px solid lightgray', borderRadius: 1}}>
            <Typography variant="h6" gutterBottom>Advanced Approval Workflow</Typography>
            {isLoadingApprovalSteps && <CircularProgress size={24} />}
            {approvalStepsError && <Alert severity="error">{approvalStepsError}</Alert>}
            {!isLoadingApprovalSteps && !approvalStepsError && approvalSteps.length === 0 && (
                 <Typography color="textSecondary">No approval steps found or generated for this IOM yet.</Typography>
            )}
            {!isLoadingApprovalSteps && !approvalStepsError && approvalSteps.length > 0 && (
                <List dense sx={{ width: '100%'}}>
                    {approvalSteps.map(step => {
                        let chipColor: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
                        switch (step.status) {
                            case 'pending': chipColor = 'warning'; break;
                            case 'approved': chipColor = 'success'; break;
                            case 'rejected': chipColor = 'error'; break;
                            case 'delegated': chipColor = 'info'; break;
                            case 'skipped': chipColor = 'secondary'; break;
                            default: chipColor = 'default';
                        }

                        return (
                            <ListItem
                                key={step.id}
                                divider
                                sx={{
                                    alignItems: 'flex-start',
                                    flexDirection: 'column',
                                    mb: 1,
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    bgcolor: step.status === 'pending' ? 'action.hover' : 'background.paper'
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
                                        {step.step_order}. {step.rule_name_snapshot || step.approval_rule_name || 'Approval Step'}
                                    </Typography>
                                    <Chip
                                        label={step.status_display || step.status}
                                        color={chipColor}
                                        size="small"
                                        icon={
                                            step.status === 'pending' ? <PendingActionsIcon fontSize="small" /> :
                                            step.status === 'approved' ? <CheckCircleOutlineIcon fontSize="small" /> :
                                            step.status === 'rejected' ? <HighlightOffIcon fontSize="small" /> :
                                            step.status === 'skipped' ? <SkipNextIcon fontSize="small" /> :
                                            step.status === 'delegated' ? <ForwardIcon fontSize="small" /> : undefined
                                        }
                                    />
                                </Box>

                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                    Assigned: {step.assigned_approver_user_name ? `User: ${step.assigned_approver_user_name}` : step.assigned_approver_group_name ? `Group: ${step.assigned_approver_group_name}` : 'N/A'}
                                </Typography>

                                {step.actioned_by_user_name && (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                        Actioned By: {step.actioned_by_user_name}
                                        {step.decision_date ? ` on ${new Date(step.decision_date).toLocaleString()}` : ''}
                                    </Typography>
                                )}

                                {step.comments && (
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic', whiteSpace: 'pre-wrap', color: 'text.hint', fontSize: '0.75rem' }}>
                                        Comments: {step.comments}
                                    </Typography>
                                )}
                                {/* Action buttons for Advanced Approval Steps */}
                                <Box sx={{width: '100%', mt:1, display: 'flex', gap: 1, justifyContent: 'flex-end'}}>
                                    {(step.status === 'pending' && user &&
                                     (step.assigned_approver_user === user.id ||
                                      (step.assigned_approver_group_name && user.groups?.includes(step.assigned_approver_group_name)))) && (
                                        <>
                                            <Button
                                                onClick={() => handleAdvancedApprovalAction(step.id, 'approve')}
                                                variant="outlined"
                                                color="success"
                                                size="small"
                                                startIcon={<CheckCircleOutlineIcon />}
                                                disabled={isActionLoading}
                                            >
                                                Approve Step
                                            </Button>
                                            <Button
                                                onClick={() => handleAdvancedApprovalAction(step.id, 'reject')}
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                startIcon={<HighlightOffIcon />}
                                                disabled={isActionLoading || !comments.trim()}
                                            >
                                                Reject Step
                                            </Button>
                                        </>
                                    )}
                                </Box>
                            </ListItem>
                        );
                    })}
                </List>
            )}
        </Box>
      )}
    </Box>
  );
};

export default GenericIomDetailComponent;
