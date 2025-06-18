import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Grid, Autocomplete, CircularProgress, Chip
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { ConfigurationItem, NewConfigurationItemData, CIType, CIStatus, CICriticality, CITypeOptions, CIStatusOptions, CICriticalityOptions } from '../types';
import { AssetLite, getAssetsLite } from '../../../api/assetApi'; // Assuming assetApi is one level up from modules
import { getConfigItems } from '../api'; // To fetch other CIs for linking
import { useAuth } from '../../../context/auth/useAuth';

interface ConfigurationItemFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NewConfigurationItemData, id?: number) => Promise<void>;
  initialData?: ConfigurationItem | null;
}

const ConfigurationItemForm: React.FC<ConfigurationItemFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { authenticatedFetch } = useAuth();
  const [name, setName] = useState('');
  const [ciType, setCiType] = useState<CIType>(CITypeOptions[0]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CIStatus>(CIStatusOptions[0]);
  const [linkedAsset, setLinkedAsset] = useState<AssetLite | null>(null);
  const [relatedCIs, setRelatedCIs] = useState<ConfigurationItem[]>([]); // Store full objects for display
  const [version, setVersion] = useState('');
  const [criticality, setCriticality] = useState<CICriticality>(CICriticalityOptions[1]); // Default to medium

  const [availableAssets, setAvailableAssets] = useState<AssetLite[]>([]);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(false);
  const [availableCIs, setAvailableCIs] = useState<ConfigurationItem[]>([]);
  const [loadingCIs, setLoadingCIs] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      // Fetch assets for dropdown
      const fetchAssets = async () => {
        if (!authenticatedFetch) return;
        setLoadingAssets(true);
        try {
          const assets = await getAssetsLite(authenticatedFetch);
          setAvailableAssets(assets);
        } catch (error) {
          console.error("Failed to fetch assets for CI form", error);
        } finally {
          setLoadingAssets(false);
        }
      };

      // Fetch other CIs for linking (excluding self if editing)
      const fetchCIs = async () => {
         if (!authenticatedFetch) return;
         setLoadingCIs(true);
         try {
            const allCIs = await getConfigItems(); // Assumes getConfigItems is available via authenticatedFetch if needed by apiClient
            setAvailableCIs(initialData ? allCIs.filter(ci => ci.id !== initialData.id) : allCIs);
         } catch (error) {
            console.error("Failed to fetch CIs for linking", error);
         } finally {
            setLoadingCIs(false);
         }
      };

      fetchAssets();
      fetchCIs();
    }
  }, [open, authenticatedFetch, initialData]);


  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCiType(initialData.ci_type);
      setDescription(initialData.description || '');
      setStatus(initialData.status);
      setLinkedAsset(initialData.linked_asset_details || null);
      // Map related_cis (IDs) to full CI objects from availableCIs for Autocomplete
      // This assumes related_cis on initialData are just IDs. If they are full objects, adjust accordingly.
      const currentRelatedCIs = initialData.related_cis && Array.isArray(initialData.related_cis)
        ? availableCIs.filter(ci => initialData.related_cis.includes(ci.id))
        : [];
      setRelatedCIs(currentRelatedCIs);
      setVersion(initialData.version || '');
      setCriticality(initialData.criticality);
    } else {
      // Defaults for new CI
      setName('');
      setCiType(CITypeOptions[0]);
      setDescription('');
      setStatus(CIStatusOptions[0]);
      setLinkedAsset(null);
      setRelatedCIs([]);
      setVersion('');
      setCriticality(CICriticalityOptions[1]);
    }
  }, [initialData, open, availableCIs]); // Rerun when availableCIs is populated

  const handleSubmit = async () => {
    const ciData: NewConfigurationItemData = {
      name,
      ci_type: ciType,
      description: description || undefined,
      status,
      linked_asset: linkedAsset?.id || undefined,
      related_cis: relatedCIs.map(ci => ci.id), // Send array of IDs
      version: version || undefined,
      criticality,
    };
    await onSubmit(ciData, initialData?.id);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{initialData ? 'Edit Configuration Item' : 'Create New Configuration Item'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required margin="dense" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="dense" required>
              <InputLabel>CI Type</InputLabel>
              <Select value={ciType} onChange={(e: SelectChangeEvent<CIType>) => setCiType(e.target.value as CIType)} label="CI Type">
                {CITypeOptions.map(option => <MenuItem key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Status</InputLabel>
              <Select value={status} onChange={(e: SelectChangeEvent<CIStatus>) => setStatus(e.target.value as CIStatus)} label="Status">
                {CIStatusOptions.map(option => <MenuItem key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={3} margin="dense" />
          </Grid>
          <Grid item xs={12} sm={6}>
             <Autocomplete
                options={availableAssets}
                getOptionLabel={(option) => `${option.asset_tag} - ${option.name}`}
                value={linkedAsset}
                onChange={(_event, newValue) => {
                    setLinkedAsset(newValue);
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                loading={loadingAssets}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Link Asset (Optional)"
                        margin="dense"
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loadingAssets ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                    />
                )}
            />
          </Grid>
           <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Criticality</InputLabel>
              <Select value={criticality} onChange={(e: SelectChangeEvent<CICriticality>) => setCriticality(e.target.value as CICriticality)} label="Criticality">
                {CICriticalityOptions.map(option => <MenuItem key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Version" value={version} onChange={(e) => setVersion(e.target.value)} fullWidth margin="dense" />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
                multiple
                options={availableCIs}
                getOptionLabel={(option) => `${option.id}: ${option.name} (${option.ci_type})`}
                value={relatedCIs}
                onChange={(_event, newValue) => {
                    setRelatedCIs(newValue);
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                loading={loadingCIs}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip variant="outlined" label={`${option.id}: ${option.name}`} {...getTagProps({ index })} />
                    ))
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Link Related CIs (Optional)"
                        margin="dense"
                         InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loadingCIs ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                    />
                )}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {initialData ? 'Save Changes' : 'Create CI'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfigurationItemForm;
