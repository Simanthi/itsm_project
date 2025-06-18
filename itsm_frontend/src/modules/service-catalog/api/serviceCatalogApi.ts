import apiClient from '../../../api/apiClient'; // Adjust path as needed
import { CatalogCategory, CatalogItem } from '../types';

export const getCatalogCategories = async (): Promise<CatalogCategory[]> => {
    // Ensure the response structure matches PaginatedResponse or direct list
    const response = await apiClient.get<{ results: CatalogCategory[] } | CatalogCategory[]>('/api/service-catalog/categories/');
    // Check if 'results' property exists (for paginated responses)
    if (response.data && Array.isArray((response.data as { results: CatalogCategory[] }).results)) {
        return (response.data as { results: CatalogCategory[] }).results;
    }
    // Assume it's a direct array if 'results' is not present
    return response.data as CatalogCategory[];
};

export const getCatalogItems = async (categoryId?: number | string): Promise<CatalogItem[]> => {
    const params = categoryId ? { category: categoryId } : {};
    // Ensure the response structure matches PaginatedResponse or direct list
    const response = await apiClient.get<{ results: CatalogItem[] } | CatalogItem[]>('/api/service-catalog/items/', { params });
    if (response.data && Array.isArray((response.data as { results: CatalogItem[] }).results)) {
        return (response.data as { results: CatalogItem[] }).results;
    }
    return response.data as CatalogItem[];
};

export const getCatalogItemById = async (itemId: number | string): Promise<CatalogItem> => {
    const response = await apiClient.get<CatalogItem>(`/api/service-catalog/items/${itemId}/`);
    return response.data;
};
