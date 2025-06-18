import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'; // Example Icon
import { useNavigate } from 'react-router-dom';
import type { CatalogCategory } from '../types/ServiceCatalogTypes'; // Direct import for CatalogCategory
import { type CatalogItem } from '../types'; // Keep CatalogItem via index, make type-only
import { getCatalogCategories, getCatalogItems } from '../api'; // Assuming index export

const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<Record<number, CatalogItem[]>>({});
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [loadingItems, setLoadingItems] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const fetchedCategories = await getCatalogCategories();
        setCategories(fetchedCategories);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch service catalog categories.');
        console.error(err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const handleCategoryToggle = async (categoryId: number, isExpanded: boolean) => {
    if (isExpanded && !itemsByCategory[categoryId] && !loadingItems[categoryId]) {
      setLoadingItems(prev => ({ ...prev, [categoryId]: true }));
      try {
        const fetchedItems = await getCatalogItems(categoryId);
        setItemsByCategory(prev => ({ ...prev, [categoryId]: fetchedItems }));
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to fetch items for category ${categoryId}.`);
        console.error(err);
      } finally {
        setLoadingItems(prev => ({ ...prev, [categoryId]: false }));
      }
    }
  };

  const handleRequestItem = (item: CatalogItem) => {
    navigate('/service-requests/new', {
      state: {
        catalog_item_id: item.id,
        prefill_title: item.name,
        prefill_description: item.short_description,
      },
    });
  };

  if (loadingCategories) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  if (error && categories.length === 0) { // Show error only if no categories could be loaded at all
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Service Catalog
      </Typography>
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>} {/* Show non-blocking error */}

      {categories.length === 0 && !loadingCategories && (
        <Typography>No service catalog categories found.</Typography>
      )}

      {categories.map((category) => (
        <Accordion
          key={category.id}
          onChange={(_event, isExpanded) => handleCategoryToggle(category.id, isExpanded)}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{category.name}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {category.description && <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>{category.description}</Typography>}
            {loadingItems[category.id] && <CircularProgress size={24} />}
            {!loadingItems[category.id] && itemsByCategory[category.id] && itemsByCategory[category.id].length === 0 && (
              <Typography>No items found in this category.</Typography>
            )}
            <Grid container spacing={2}>
              {itemsByCategory[category.id]?.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {item.icon_url ? (
                          <Avatar src={item.icon_url} sx={{ mr: 1.5, width: 32, height: 32 }} />
                        ) : (
                          <Avatar sx={{ mr: 1.5, width: 32, height: 32 }}><ShoppingCartIcon fontSize="small" /></Avatar>
                        )}
                        <Typography variant="h6" component="div">
                          {item.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {item.short_description}
                      </Typography>
                      {item.estimated_fulfillment_time && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Est. Fulfillment: {item.estimated_fulfillment_time}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ mt: 'auto', justifyContent: 'flex-start', pl: 2, pb: 2 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleRequestItem(item)}
                      >
                        Request this
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default CatalogPage;
