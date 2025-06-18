// itsm_frontend/src/modules/incidents/IncidentManagementPage.tsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, IconButton, Chip } from '@mui/material'; // Added IconButton and Chip
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'; // Added GridActionsCellItem
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit'; // Added EditIcon
// import { useNavigate } from 'react-router-dom';
import { Incident, NewIncidentData } from './types'; // Added NewIncidentData
// import apiClient from '../../api/apiClient'; // Placeholder
import { useUI } from '../../context/UIContext/useUI'; // For snackbar
import IncidentForm from './components/IncidentForm'; // Import the form

const IncidentManagementPage: React.FC = () => {
    // const navigate = useNavigate();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { showSnackbar } = useUI(); // For snackbar

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

    // Helper function for SLA display
    const getSlaCellChip = (targetDateString: string | null | undefined, now: Date = new Date()) => {
        if (!targetDateString) {
            return <Typography variant="caption">N/A</Typography>;
        }
        const targetDate = new Date(targetDateString);
        if (isNaN(targetDate.getTime())) {
            return <Typography variant="caption">Invalid Date</Typography>;
        }

        const diffHours = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        let chipColor: 'error' | 'warning' | 'success' | 'default' = 'default';
        let label = targetDate.toLocaleString();

        if (diffHours < 0) {
            chipColor = 'error'; // Breached
            label = `Breached: ${targetDate.toLocaleString()}`;
        } else if (diffHours < 24) { // Example: Warning if less than 24 hours remaining
            chipColor = 'warning';
            label = `Due: ${targetDate.toLocaleString()}`;
        } else {
            chipColor = 'success'; // Or 'default' if you prefer less color
            label = `Target: ${targetDate.toLocaleString()}`;
        }
        return <Chip label={label} color={chipColor} size="small" variant="outlined" />;
    };

    useEffect(() => {
        const fetchIncidents = async () => {
            try {
                setLoading(true);
                // Placeholder API call with SLA data
                await new Promise(resolve => setTimeout(resolve, 500));
                const now = new Date();
                setIncidents([
                  {
                    id: 1, title: 'Network Outage', description: 'Full network is down for Building A.',
                    status: 'new', impact: 'high', urgency: 'high', priority: 'critical', calculated_priority: 'critical',
                    created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                    updated_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
                    reported_by_username: 'user1', assigned_to_username: 'admin1',
                    sla_response_target_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // Breached response
                    sla_resolve_target_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // Due in 2 hours
                  },
                  {
                    id: 2, title: 'Printer Jam', description: 'Printer in HR is jammed again.',
                    status: 'in_progress', impact: 'low', urgency: 'medium', priority: 'low', calculated_priority: 'low',
                    created_at: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString(), // 30 hours ago
                    updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                    reported_by_username: 'user2', assigned_to_username: 'tech1',
                    sla_response_target_at: new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString(), // OK response
                    sla_resolve_target_at: new Date(now.getTime() + 100 * 60 * 60 * 1000).toISOString(), // OK resolve
                  },
                   {
                    id: 3, title: 'Cannot Login', description: 'User cannot login to CRM.',
                    status: 'new', impact: 'medium', urgency: 'high', priority: 'high', calculated_priority: 'high',
                    created_at: new Date(now.getTime() - 0.5 * 60 * 60 * 1000).toISOString(), // 30 mins ago
                    updated_at: new Date(now.getTime() - 0.5 * 60 * 60 * 1000).toISOString(),
                    reported_by_username: 'user3',
                    sla_response_target_at: new Date(now.getTime() + 3.5 * 60 * 60 * 1000).toISOString(), // OK for High
                    sla_resolve_target_at: new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString(), // Warning for High
                  },
                ]);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
                setIncidents([]);
            } finally {
                setLoading(false);
            }
        };
        fetchIncidents();
    }, []);

    const handleOpenCreateForm = () => {
        setEditingIncident(null);
        setIsFormOpen(true);
    };

    const handleOpenEditForm = (incident: Incident) => {
        setEditingIncident(incident);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingIncident(null);
    };

    const handleSubmitForm = async (data: NewIncidentData | Partial<NewIncidentData>, id?: number) => {
        setLoading(true); // Show loading indicator during submission
        try {
            if (id) {
                // Update incident (placeholder)
                console.log('Updating incident:', id, data);
                // await updateIncident(id, data); // Replace with actual API call
                // For mock, update local state:
                setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, ...data, calculated_priority: calculateDisplayPriority(data.impact || inc.impact, data.urgency || inc.urgency), updated_at: new Date().toISOString() } as Incident : inc));
                showSnackbar('Incident updated successfully!', 'success');
            } else {
                // Create incident (placeholder)
                console.log('Creating incident:', data);
                // await createIncident(data as NewIncidentData); // Replace with actual API call
                // For mock, add to local state:
                const newIncident: Incident = {
                    id: Date.now(), // Simple mock ID
                    ...data,
                    priority: calculateDisplayPriority(data.impact!, data.urgency!), // temp
                    calculated_priority: calculateDisplayPriority(data.impact!, data.urgency!),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    status: data.status || 'new',
                } as Incident;
                setIncidents(prev => [newIncident, ...prev]);
                showSnackbar('Incident created successfully!', 'success');
            }
            // await fetchIncidents(); // Usually refresh list from server, but using mock updates for now
            handleCloseForm();
        } catch (err) {
            showSnackbar(err instanceof Error ? err.message : 'Failed to save incident', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Temporary: Manual calculation for display in form until backend provides it for new/unsaved
    // This is duplicated from IncidentForm, ideally should be a shared util if complex
    const calculateDisplayPriority = (currentImpact: Incident['impact'], currentUrgency: Incident['urgency']): Incident['priority'] => {
        if (currentImpact === 'high' && currentUrgency === 'high') return 'critical';
        if ((currentImpact === 'high' && currentUrgency === 'medium') || (currentImpact === 'medium' && currentUrgency === 'high')) return 'high';
        if (currentImpact === 'high' && currentUrgency === 'low') return 'medium';
        if (currentImpact === 'medium' && currentUrgency === 'medium') return 'medium';
        if ((currentImpact === 'medium' && currentUrgency === 'low') || (currentImpact === 'low' && currentUrgency === 'high')) return 'medium';
        if (currentImpact === 'low' && currentUrgency === 'medium') return 'low';
        if (currentImpact === 'low' && currentUrgency === 'low') return 'low';
        return 'medium'; // Default
    };


    const columns: GridColDef<Incident>[] = [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'title', headerName: 'Title', width: 250 },
        { field: 'status', headerName: 'Status', width: 120 },
        { field: 'impact', headerName: 'Impact', width: 100 },
        { field: 'urgency', headerName: 'Urgency', width: 100 },
        { field: 'priority', headerName: 'Old Priority', width: 120, description: "Original priority field" },
        { field: 'calculated_priority', headerName: 'Calculated Priority', width: 150, description: "Priority from Impact/Urgency" },
        { field: 'reported_by_username', headerName: 'Reported By', width: 150 },
        { field: 'assigned_to_username', headerName: 'Assigned To', width: 150 },
        {
            field: 'created_at',
            headerName: 'Created At',
            width: 180,
            type: 'dateTime',
            valueGetter: (value) => value ? new Date(value) : null
        },
        {
            field: 'sla_response_target_at',
            headerName: 'SLA Response Target',
            width: 230,
            renderCell: (params) => getSlaCellChip(params.value as string | null),
        },
        {
            field: 'sla_resolve_target_at',
            headerName: 'SLA Resolve Target',
            width: 230,
            renderCell: (params) => getSlaCellChip(params.value as string | null),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ row }) => [
                <GridActionsCellItem
                    icon={<EditIcon />}
                    label="Edit"
                    onClick={() => handleOpenEditForm(row)}
                    key={`edit-${row.id}`} // Added key prop
                />,
            ],
        },
    ];

    if (loading && incidents.length === 0) { // Show full page loader only on initial load
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (error && incidents.length === 0) { // Show full page error only if no data is available
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    return (
        <Box sx={{ p: 3, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" component="h1">Manage Incidents</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateForm} >
                    New Incident
                </Button>
            </Box>
            {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>} {/* Show non-blocking error if data is stale */}
            <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={incidents}
                    columns={columns}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                    loading={loading} // Show DataGrid's own loading indicator during refreshes
                    // Add other props like checkboxSelection, onRowClick, etc. if needed later
                />
            </Box>
            <IncidentForm
                open={isFormOpen}
                onClose={handleCloseForm}
                onSubmit={handleSubmitForm}
                initialData={editingIncident}
            />
        </Box>
    );
};
export default IncidentManagementPage;
