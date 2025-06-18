// itsm_frontend/src/modules/incidents/components/IncidentForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  Box,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { type Incident, type NewIncidentData, type ImpactLevel, type UrgencyLevel, type IncidentStatus, type PriorityLevel } from '../types';

interface IncidentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NewIncidentData | Partial<NewIncidentData>, id?: number) => Promise<void>;
  initialData?: Incident | null;
}

const impactLevels: ImpactLevel[] = ['low', 'medium', 'high'];
const urgencyLevels: UrgencyLevel[] = ['low', 'medium', 'high'];
const statusOptions: IncidentStatus[] = ['new', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled'];

const IncidentForm: React.FC<IncidentFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IncidentStatus>('new');
  const [impact, setImpact] = useState<ImpactLevel>('medium');
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  // Removed unused currentCalculatedPriority

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setStatus(initialData.status);
      setImpact(initialData.impact);
      setUrgency(initialData.urgency);
      // setAssignedToId(initialData.assigned_to_id || null); // If available
      // Removed setCurrentCalculatedPriority
    } else {
      // Defaults for new incident
      setTitle('');
      setDescription('');
      setStatus('new');
      setImpact('medium');
      setUrgency('medium');
      // setAssignedToId(null);
      // Removed setCurrentCalculatedPriority
    }
  }, [initialData, open]); // Re-initialize when initialData changes or form opens

  const handleSubmit = async () => {
    const incidentData: NewIncidentData | Partial<NewIncidentData> = {
      title,
      description,
      status,
      impact,
      urgency,
      // assigned_to_id: assignedToId, // Placeholder
    };
    await onSubmit(incidentData, initialData?.id);
  };

  // Temporary: Manual calculation for display in form until backend provides it for new/unsaved
  const calculateDisplayPriority = (currentImpact: ImpactLevel, currentUrgency: UrgencyLevel): PriorityLevel => {
    if (currentImpact === 'high' && currentUrgency === 'high') return 'critical';
    if ((currentImpact === 'high' && currentUrgency === 'medium') || (currentImpact === 'medium' && currentUrgency === 'high')) return 'high';
    if (currentImpact === 'high' && currentUrgency === 'low') return 'medium';
    if (currentImpact === 'medium' && currentUrgency === 'medium') return 'medium';
    if ((currentImpact === 'medium' && currentUrgency === 'low') || (currentImpact === 'low' && currentUrgency === 'high')) return 'medium';
    if (currentImpact === 'low' && currentUrgency === 'medium') return 'low';
    if (currentImpact === 'low' && currentUrgency === 'low') return 'low';
    return 'medium'; // Default
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initialData ? 'Edit Incident' : 'Create New Incident'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{mt: 1}}>
          <Grid item xs={12}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              margin="dense"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              required
              multiline
              rows={4}
              margin="dense"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={(e: SelectChangeEvent<IncidentStatus>) => setStatus(e.target.value as IncidentStatus)}
                label="Status"
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Impact</InputLabel>
              <Select
                value={impact}
                onChange={(e: SelectChangeEvent<ImpactLevel>) => setImpact(e.target.value as ImpactLevel)}
                label="Impact"
              >
                {impactLevels.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Urgency</InputLabel>
              <Select
                value={urgency}
                onChange={(e: SelectChangeEvent<UrgencyLevel>) => setUrgency(e.target.value as UrgencyLevel)}
                label="Urgency"
              >
                {urgencyLevels.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {/* Display calculated priority */}
            <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pl:1, mt:1 }}>
                    <Typography variant="subtitle1" component="div" sx={{ mr: 1 }}>
                        Calculated Priority:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {initialData?.calculated_priority ?
                            (initialData.calculated_priority.charAt(0).toUpperCase() + initialData.calculated_priority.slice(1)) :
                            (calculateDisplayPriority(impact, urgency).charAt(0).toUpperCase() + calculateDisplayPriority(impact, urgency).slice(1))
                        }
                    </Typography>
                </Box>
            </Grid>
            {initialData && initialData.priority && (
                 <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pl:1, mt:1 }}>
                        <Typography variant="caption" component="div" sx={{ mr: 1, color: 'text.secondary' }}>
                            (Old Manual Priority:
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                            {initialData.priority.charAt(0).toUpperCase() + initialData.priority.slice(1)})
                        </Typography>
                    </Box>
                </Grid>
            )}
            {/* Display SLA Dates if editing */}
            {initialData && (
                <>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="SLA Response Target"
                            value={initialData.sla_response_target_at ? new Date(initialData.sla_response_target_at).toLocaleString() : 'N/A'}
                            fullWidth
                            margin="dense"
                            InputProps={{ readOnly: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="SLA Resolve Target"
                            value={initialData.sla_resolve_target_at ? new Date(initialData.sla_resolve_target_at).toLocaleString() : 'N/A'}
                            fullWidth
                            margin="dense"
                            InputProps={{ readOnly: true }}
                        />
                    </Grid>
                </>
            )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {initialData ? 'Save Changes' : 'Create Incident'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IncidentForm;
