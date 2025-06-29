import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  List,
  // ListItem, // Removed unused import
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  // Paper, // Removed unused import
  Collapse,
  // IconButton, // Removed unused import
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description'; // For templates
import CategoryIcon from '@mui/icons-material/Category'; // For categories
import SearchIcon from '@mui/icons-material/Search';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useNavigate, useLocation } from 'react-router-dom'; // Added useLocation

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import { getIomTemplates } from '../../../api/genericIomApi';
import type { IOMTemplate } from '../../iomTemplateAdmin/types/iomTemplateAdminTypes'; // IOMCategory removed

interface GroupedTemplates {
  [categoryName: string]: IOMTemplate[];
}

const SelectIomTemplateComponent: React.FC = () => {
  const { authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Get location to access state
  const { showSnackbar } = useUI();

  // Extract assetContext from location state if present
  const assetContext = location.state?.assetContext;

  // const [templates, setTemplates] = useState<IOMTemplate[]>([]); // Removed unused state
  const [groupedTemplates, setGroupedTemplates] = useState<GroupedTemplates>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const fetchAndGroupTemplates = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch only active templates for users to select from
      const response = await getIomTemplates(authenticatedFetch, { is_active: true, pageSize: 500 }); // Fetch many
      // setTemplates(response.results); // Removed as templates state is removed

      const grouped: GroupedTemplates = {};
      response.results.forEach(template => {
        const categoryName = template.category_name || 'Uncategorized';
        if (!grouped[categoryName]) {
          grouped[categoryName] = [];
        }
        grouped[categoryName].push(template);
      });
      setGroupedTemplates(grouped);
      // Initially open all categories
      const initialOpenState: Record<string, boolean> = {};
      Object.keys(grouped).forEach(catName => initialOpenState[catName] = true);
      setOpenCategories(initialOpenState);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to fetch IOM templates.');
      showSnackbar(`Error fetching templates: ${message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, showSnackbar]);

  useEffect(() => {
    fetchAndGroupTemplates();
  }, [fetchAndGroupTemplates]);

  const handleTemplateSelect = (template: IOMTemplate) => {
    // Standard name for the special Purchase Request Memo template
    const purchaseRequestMemoTemplateName = "Purchase Request Memo";

    if (template.name === purchaseRequestMemoTemplateName) {
      // If PRM template, navigate to its specific form, potentially carrying context if that form can use it
      navigate('/procurement/iom/new', { state: { assetContext } }); // Pass context along
    } else {
      // For generic IOMs, navigate to the generic form, passing templateId and any context
      navigate(`/ioms/new/${template.id}`, { state: { assetContext } });
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
  };

  const filteredGroupedTemplates = Object.entries(groupedTemplates).reduce((acc, [categoryName, templatesInCategory]) => {
    const filteredTemplates = templatesInCategory.filter(template =>
      template.name.toLowerCase().includes(searchTerm) ||
      (template.description && template.description.toLowerCase().includes(searchTerm))
    );
    if (filteredTemplates.length > 0) {
      acc[categoryName] = filteredTemplates;
    }
    return acc;
  }, {} as GroupedTemplates);


  if (isLoading) {
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

  const categoryOrder = Object.keys(filteredGroupedTemplates).sort((a,b) => a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b));


  return (
    <Box>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search templates by name or description..."
        value={searchTerm}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {categoryOrder.length === 0 && !isLoading && (
        <Typography>No templates found matching your criteria.</Typography>
      )}

      <List component="nav" aria-labelledby="nested-list-subheader">
        {categoryOrder.map((categoryName) => (
          <React.Fragment key={categoryName}>
            <ListItemButton onClick={() => toggleCategory(categoryName)} sx={{backgroundColor: 'action.hover', borderRadius:1, mb:0.5}}>
              <ListItemIcon>
                <CategoryIcon />
              </ListItemIcon>
              <ListItemText primary={<Typography variant="h6">{categoryName}</Typography>} />
              {openCategories[categoryName] ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={openCategories[categoryName]} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ pl: 2 }}>
                {filteredGroupedTemplates[categoryName].map((template) => (
                  <ListItemButton
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)} // Pass the whole template object
                    sx={{borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 0}}}
                  >
                    <ListItemIcon>
                      <DescriptionIcon />
                    </ListItemIcon>
                    <ListItemText
                        primary={template.name}
                        secondary={template.description || 'No description available.'}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default SelectIomTemplateComponent;
