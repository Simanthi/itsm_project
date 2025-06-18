// import { apiClient } from '../../../api/apiClient'; // No longer directly used
import { type ConfigurationItem, type NewConfigurationItemData } from '../types';
import type { AuthenticatedFetch } from '../../../context/auth/AuthContextDefinition'; // Import AuthenticatedFetch

// Helper to handle DRF's paginated response vs direct list
// Assuming authenticatedFetch returns the direct data structure (e.g., results array or single object)
const processListResponse = <T>(response: { results: T[] } | T[]): T[] => {
    if (response && Array.isArray((response as { results: T[] }).results)) {
        return (response as { results: T[] }).results;
    }
    return response as T[];
};

export const getConfigItems = async (authenticatedFetch: AuthenticatedFetch): Promise<ConfigurationItem[]> => {
    const response = await authenticatedFetch<{ results: ConfigurationItem[] } | ConfigurationItem[]>(
        '/configs/items/',
        { method: 'GET' }
    );
    return processListResponse(response);
};

export const getConfigItemById = async (authenticatedFetch: AuthenticatedFetch, id: number): Promise<ConfigurationItem> => {
    const response = await authenticatedFetch<ConfigurationItem>(
        `/configs/items/${id}/`,
        { method: 'GET' }
    );
    return response; // Assuming direct data return
};

export const createConfigItem = async (authenticatedFetch: AuthenticatedFetch, data: NewConfigurationItemData): Promise<ConfigurationItem> => {
    const response = await authenticatedFetch<ConfigurationItem>(
        '/configs/items/',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }
    );
    return response; // Assuming direct data return
};

export const updateConfigItem = async (authenticatedFetch: AuthenticatedFetch, id: number, data: Partial<NewConfigurationItemData>): Promise<ConfigurationItem> => {
    const response = await authenticatedFetch<ConfigurationItem>(
        `/configs/items/${id}/`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }
    );
    return response; // Assuming direct data return
};

export const deleteConfigItem = async (authenticatedFetch: AuthenticatedFetch, id: number): Promise<void> => {
    await authenticatedFetch<void>(
        `/configs/items/${id}/`,
        { method: 'DELETE' }
    );
};
