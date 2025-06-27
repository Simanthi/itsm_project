import React, { useState, useEffect, useCallback } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField, // For comments in actions
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import GroupIcon from '@mui/icons-material/Group';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SubjectIcon from '@mui/icons-material/Subject';
import LabelIcon from '@mui/icons-material/Label';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import PublishIcon from '@mui/icons-material/Publish';
import SendIcon from '@mui/icons-material/Send'; // For submit for approval

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import {
    getGenericIomById,
    submitGenericIomForSimpleApproval,
    simpleApproveGenericIom,
    simpleRejectGenericIom,
    publishGenericIom
} from '../../../api/genericIomApi';
import type { GenericIOM, GenericIomSimpleActionPayload } from '../types/genericIomTypes';
import type { FieldDefinition } from '../../iomTemplateAdmin/types/iomTemplateAdminTypes';
// TODO: Import types and API function for ApprovalSteps

interface GenericIomDetailComponentProps {
  iomId: number;
}

// Helper to display dynamic field values appropriately
const DisplayDynamicFieldValue: React.FC<{field: FieldDefinition, value: any}> = ({ field, value }) => {
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
  const [comments, setComments] = useState<string>(''); // For simple approve/reject actions

  const fetchIomDetails = useCallback(async () => {
    if (!authenticatedFetch || !iomId) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchedIom = await getGenericIomById(authenticatedFetch, iomId);
      setIom(fetchedIom);
      // TODO: If approval_type is 'advanced', fetch approval steps here
      // e.g., const steps = await getApprovalStepsForIom(authenticatedFetch, 'generic_iom', iomId);
      // setApprovalSteps(steps);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setError(`Failed to load IOM details: ${message}`);
      showSnackbar(`Error: ${message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, iomId, showSnackbar]);

  useEffect(() => {
    fetchIomDetails();
  }, [fetchIomDetails]);

  const handleAction = async (actionType: 'submit' | 'approve' | 'reject' | 'publish') => {
    if (!iom || !authenticatedFetch) return;

    setIsActionLoading(true);
    setActionError(null);
    setComments(''); // Reset comments for next action

    const actionPayload: GenericIomSimpleActionPayload = { comments };

    try {
      let updatedIom: GenericIOM | null = null;
      let successMessage = '';

      if (actionType === 'submit') {
        updatedIom = await submitGenericIomForSimpleApproval(authenticatedFetch, iom.id);
        successMessage = "IOM submitted for simple approval.";
      } else if (actionType === 'approve') {
        if (iom.iom_template_details?.approval_type === 'simple') {
            updatedIom = await simpleApproveGenericIom(authenticatedFetch, iom.id, actionPayload);
            successMessage = "IOM simple-approved.";
        }
      } else if (actionType === 'reject') {
        if (!comments.trim() && iom.iom_template_details?.approval_type === 'simple') {
            showSnackbar("Comments are required for rejection.", "warning");
            setActionError("Comments are required for rejection.");
            setIsActionLoading(false);
            return;
        }
        if (iom.iom_template_details?.approval_type === 'simple') {
            updatedIom = await simpleRejectGenericIom(authenticatedFetch, iom.id, actionPayload);
            successMessage = "IOM simple-rejected.";
        }
      } else if (actionType === 'publish') {
        updatedIom = await publishGenericIom(authenticatedFetch, iom.id);
        successMessage = "IOM published successfully.";
      }

      if (updatedIom) {
        setIom(updatedIom); // Refresh IOM data
        showSnackbar(successMessage, 'success');
      }
    } catch (err: any) {
      const errorData = err?.data || err;
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
  const canPerformSimpleApprovalAction = iom.status === 'pending_approval' && iom.iom_template_details?.approval_type === 'simple' &&
                                        (iom.iom_template_details?.simple_approval_user === user?.id ||
                                         (user?.groups && iom.iom_template_details?.simple_approval_group && user.groups.includes(iom.iom_template_details.simple_approval_group)));
  const canPublish = (iom.status === 'draft' && iom.iom_template_details?.approval_type === 'none') ||
                     (iom.status === 'approved'); // Approved by simple or advanced workflow

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
          {iom.to_users_details.map(u => u.username || u.id).join(', ')}
        </Box>
      )}
      {iom.to_groups_details && iom.to_groups_details.length > 0 && (
         <Box sx={{mb:1}}>
            <Typography variant="subtitle2" component="span"><strong>To Groups: </strong></Typography>
            {iom.to_groups_details.map(g => g.name || g.id).join(', ')}
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
                <DisplayDynamicFieldValue field={fieldDef} value={iom.data_payload[fieldDef.name]} />
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

        {canSubmitForSimpleApproval && (
            <Button onClick={() => handleAction('submit')} variant="contained" startIcon={<SendIcon />} sx={{mr:1}} disabled={isActionLoading}>
                {isActionLoading ? <CircularProgress size={20}/> : "Submit for Simple Approval"}
            </Button>
        )}

        {canPerformSimpleApproval && (
            <Box sx={{display: 'flex', alignItems: 'flex-start', gap:1, mb:1}}>
                <TextField
                    label="Comments (for Approve/Reject)"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    multiline rows={2} size="small" sx={{flexGrow:1}}
                    helperText={iom.status === 'pending_approval' && iom.iom_template_details?.approval_type === 'simple' && !comments.trim() ? "Comments required for rejection" : ""}
                />
                <Button onClick={() => handleAction('approve')} variant="outlined" color="success" startIcon={<CheckCircleOutlineIcon />} sx={{height: 'fit-content', mt: 'auto', mb:'auto'}} disabled={isActionLoading}>
                    {isActionLoading ? <CircularProgress size={20}/> : "Simple Approve"}
                </Button>
                <Button onClick={() => handleAction('reject')} variant="outlined" color="error" startIcon={<HighlightOffIcon />} sx={{height: 'fit-content', mt: 'auto', mb:'auto'}} disabled={isActionLoading || (!comments.trim() && iom.status === 'pending_approval')}>
                     {isActionLoading ? <CircularProgress size={20}/> : "Simple Reject"}
                </Button>
            </Box>
        )}

        {canPublish && (
            <Button onClick={() => handleAction('publish')} variant="contained" color="primary" startIcon={<PublishIcon />} disabled={isActionLoading}>
                {isActionLoading ? <CircularProgress size={20}/> : "Publish IOM"}
            </Button>
        )}

        {!(canSubmitForSimpleApproval || canPerformSimpleApproval || canPublish) && (
            <Typography color="textSecondary">No actions available for this IOM in its current state or based on your permissions.</Typography>
        )}
      </Box>

      {/* Placeholder for Advanced Approval Steps Display */}
      {iom.iom_template_details?.approval_type === 'advanced' && (
        <Box sx={{mt:3}}>
            <Typography variant="h6" gutterBottom>Advanced Approval Workflow</Typography>
            <Typography color="textSecondary">
                {/* TODO: Fetch and display ApprovalStep instances related to this IOM.
                    This will require an API endpoint like /api/procurement/approval-steps/?content_type=<ct_id>&object_id=<iom_pk>
                    and an ApprovalStepSerializer that handles the GFK.
                */}
                Advanced approval steps will be shown here. (Status: {iom.status})
            </Typography>
        </Box>
      )}
    </Box>
  );
};

export default GenericIomDetailComponent;
