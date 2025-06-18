import { apiClient } from '../../../api/apiClient';
import { type ConfigurationItem, type NewConfigurationItemData } from '../types';

// Helper to handle DRF's paginated response vs direct list
const processListResponse = <T>(response: { data: { results: T[] } | T[] }): T[] => {
    if (response.data && Array.isArray((response.data as { results: T[] }).results)) {
        return (response.data as { results: T[] }).results;
    }
    return response.data as T[];
};

export const getConfigItems = async (): Promise<ConfigurationItem[]> => {
    const response = await apiClient<{ data: { results: ConfigurationItem[] } | ConfigurationItem[] }>(
        '/configs/items/', // Removed /api prefix
        '',
        { method: 'GET' }
    );
    return processListResponse(response);
};

export const getConfigItemById = async (id: number): Promise<ConfigurationItem> => {
    const response = await apiClient<{ data: ConfigurationItem }>(
        `/configs/items/${id}/`, // Removed /api prefix
        '',
        { method: 'GET' }
    );
    return response.data;
};

export const createConfigItem = async (data: NewConfigurationItemData): Promise<ConfigurationItem> => {
    const response = await apiClient<{ data: ConfigurationItem }>(
        '/configs/items/', // Removed /api prefix
        '',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }
    );
    return response.data;
};

export const updateConfigItem = async (id: number, data: Partial<NewConfigurationItemData>): Promise<ConfigurationItem> => {
    const response = await apiClient<{ data: ConfigurationItem }>(
        `/configs/items/${id}/`, // Removed /api prefix
        '',
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }
    );
    return response.data;
};

export const deleteConfigItem = async (id: number): Promise<void> => {
    await apiClient<void>(
        `/configs/items/${id}/`, // Removed /api prefix
        '',
        { method: 'DELETE' }
    );
};
