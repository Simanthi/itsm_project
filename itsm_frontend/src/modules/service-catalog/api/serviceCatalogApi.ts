// import { apiClient } from '../../../api/apiClient'; // No longer directly used
import { type CatalogCategory } from '../types/ServiceCatalogTypes';
import { type CatalogItem } from '../types';
import type { AuthenticatedFetch } from '../../../context/auth/AuthContextDefinition'; // Import AuthenticatedFetch

// Helper to process paginated or direct list responses
// This response processing might need to be adjusted based on how authenticatedFetch returns data.
// Assuming authenticatedFetch returns the direct data (already processed by apiClient internally).
function processListResponse<T>(response: { results: T[] } | T[] ): T[] {
    if (response && Array.isArray((response as { results: T[] }).results)) {
        return (response as { results: T[] }).results;
    }
    return response as T[];
}

export const getCatalogCategories = async (authenticatedFetch: AuthenticatedFetch): Promise<CatalogCategory[]> => {
    // Assuming authenticatedFetch returns the data structure that processListResponse expects
    // Or, if authenticatedFetch itself returns the processed array, then processListResponse might not be needed here.
    // For now, we keep processListResponse and assume authenticatedFetch returns a similar structure as apiClient did.
    const response = await authenticatedFetch<{ results: CatalogCategory[] } | CatalogCategory[]>(
        '/service-catalog/categories/',
        { method: 'GET' }
    );
    return processListResponse<CatalogCategory>(response);
};

export const getCatalogItems = async (authenticatedFetch: AuthenticatedFetch, categoryId?: number | string): Promise<CatalogItem[]> => {
    const params = categoryId ? `?category=${categoryId}` : '';
    const response = await authenticatedFetch<{ results: CatalogItem[] } | CatalogItem[]>(
        `/service-catalog/items/${params}`,
        { method: 'GET' }
    );
    return processListResponse<CatalogItem>(response);
};

export const getCatalogItemById = async (authenticatedFetch: AuthenticatedFetch, itemId: number | string): Promise<CatalogItem> => {
    // For single items, typically direct data is returned, not { data: CatalogItem }
    // Adjusting based on typical authenticatedFetch which might return direct data
    const response = await authenticatedFetch<CatalogItem>(
        `/service-catalog/items/${itemId}/`,
        { method: 'GET' }
    );
    return response; // Assuming direct data return
};
