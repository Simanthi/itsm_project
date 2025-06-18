import { apiClient } from '../../../api/apiClient';
import { type CatalogCategory } from '../types/ServiceCatalogTypes';
import { type CatalogItem } from '../types';

// Helper to process paginated or direct list responses
function processListResponse<T>(response: { data: { results: T[] } | T[] }): T[] {
    if (response.data && Array.isArray((response.data as { results: T[] }).results)) {
        return (response.data as { results: T[] }).results;
    }
    return response.data as T[];
}

export const getCatalogCategories = async (token: string): Promise<CatalogCategory[]> => {
    const response = await apiClient<{ data: { results: CatalogCategory[] } | CatalogCategory[] }>(
        '/service-catalog/categories/', // Removed /api prefix
        token, // Use the passed token
        { method: 'GET' }
    );
    return processListResponse<CatalogCategory>(response);
};

export const getCatalogItems = async (token: string, categoryId?: number | string): Promise<CatalogItem[]> => {
    const params = categoryId ? `?category=${categoryId}` : '';
    const response = await apiClient<{ data: { results: CatalogItem[] } | CatalogItem[] }>(
        `/service-catalog/items/${params}`, // Removed /api prefix
        token, // Use the passed token
        { method: 'GET' }
    );
    return processListResponse<CatalogItem>(response);
};

export const getCatalogItemById = async (token: string, itemId: number | string): Promise<CatalogItem> => {
    const response = await apiClient<{ data: CatalogItem }>(
        `/service-catalog/items/${itemId}/`, // Removed /api prefix
        token, // Use the passed token
        { method: 'GET' }
    );
    return response.data;
};
