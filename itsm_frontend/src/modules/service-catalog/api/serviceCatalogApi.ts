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

export const getCatalogCategories = async (): Promise<CatalogCategory[]> => {
    const response = await apiClient<{ data: { results: CatalogCategory[] } | CatalogCategory[] }>(
        '/api/service-catalog/categories/',
        '',
        { method: 'GET' }
    );
    return processListResponse<CatalogCategory>(response);
};

export const getCatalogItems = async (categoryId?: number | string): Promise<CatalogItem[]> => {
    const params = categoryId ? `?category=${categoryId}` : '';
    const response = await apiClient<{ data: { results: CatalogItem[] } | CatalogItem[] }>(
        `/api/service-catalog/items/${params}`,
        '',
        { method: 'GET' }
    );
    return processListResponse<CatalogItem>(response);
};

export const getCatalogItemById = async (itemId: number | string): Promise<CatalogItem> => {
    const response = await apiClient<{ data: CatalogItem }>(
        `/api/service-catalog/items/${itemId}/`,
        '',
        { method: 'GET' }
    );
    return response.data;
};
