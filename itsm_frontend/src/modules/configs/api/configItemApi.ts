import apiClient from '../../../api/apiClient';
import { ConfigurationItem, NewConfigurationItemData } from '../types';

// Helper to handle DRF's paginated response vs direct list
const processListResponse = <T>(response: { data: { results: T[] } | T[] }): T[] => {
    if (response.data && Array.isArray((response.data as { results: T[] }).results)) {
        return (response.data as { results: T[] }).results;
    }
    return response.data as T[];
};


export const getConfigItems = async (): Promise<ConfigurationItem[]> => {
    const response = await apiClient.get<{ results: ConfigurationItem[] } | ConfigurationItem[]>('/api/configs/items/');
    // The backend serializer for listing might use 'related_cis_ids' for reading related CIs.
    // We map it to 'related_cis' on the frontend if needed, or ensure serializer provides 'related_cis' directly.
    // For now, assume serializer provides 'related_cis' as an array of IDs for reading, matching the write format.
    // If it's 'related_cis_ids', a mapping step would be:
    // const items = processListResponse(response);
    // return items.map(item => ({ ...item, related_cis: item.related_cis_ids || [] }));
    return processListResponse(response);
};

export const getConfigItemById = async (id: number): Promise<ConfigurationItem> => {
    const response = await apiClient.get<ConfigurationItem>(`/api/configs/items/${id}/`);
    // Similar mapping if 'related_cis_ids' is used instead of 'related_cis' for reading
    // const item = response.data;
    // return { ...item, related_cis: item.related_cis_ids || [] };
    return response.data;
};

export const createConfigItem = async (data: NewConfigurationItemData): Promise<ConfigurationItem> => {
    const response = await apiClient.post<ConfigurationItem>('/api/configs/items/', data);
    return response.data;
};

export const updateConfigItem = async (id: number, data: Partial<NewConfigurationItemData>): Promise<ConfigurationItem> => {
    const response = await apiClient.put<ConfigurationItem>(`/api/configs/items/${id}/`, data);
    return response.data;
};

export const deleteConfigItem = async (id: number): Promise<void> => {
    await apiClient.delete(`/api/configs/items/${id}/`);
};
