import apiClient from '../../../api/apiClient'; // Adjust path
import { ChangeRequest, NewChangeRequestData } from '../types';

// Helper for list responses if pagination is used by default by apiClient
const processListResponse = <T>(response: any): T[] => {
    // Check if response.data itself is the array (direct list)
    if (Array.isArray(response.data)) {
        return response.data as T[];
    }
    // Check for DRF's default paginated structure
    if (response.data && Array.isArray(response.data.results)) {
        return response.data.results;
    }
    // Fallback if the structure is unexpected, though this should ideally not happen
    // Or, if sometimes the data is directly under .data without 'results'
    console.warn("Unexpected API response structure for list:", response);
    return []; // Or handle error appropriately
};

export const getChangeRequests = async (): Promise<ChangeRequest[]> => {
    const response = await apiClient.get('/api/changes/requests/');
    return processListResponse<ChangeRequest>(response);
};

export const getChangeRequestById = async (id: number): Promise<ChangeRequest> => {
    const response = await apiClient.get<ChangeRequest>(`/api/changes/requests/${id}/`);
    return response.data;
};

export const createChangeRequest = async (data: NewChangeRequestData): Promise<ChangeRequest> => {
    const response = await apiClient.post<ChangeRequest>('/api/changes/requests/', data);
    return response.data;
};

export const updateChangeRequest = async (id: number, data: Partial<NewChangeRequestData>): Promise<ChangeRequest> => {
    const response = await apiClient.put<ChangeRequest>(`/api/changes/requests/${id}/`, data);
    return response.data;
};

export const deleteChangeRequest = async (id: number): Promise<void> => {
    await apiClient.delete(`/api/changes/requests/${id}/`);
};
