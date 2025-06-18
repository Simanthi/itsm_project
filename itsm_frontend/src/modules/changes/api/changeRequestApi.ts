import { apiClient } from '../../../api/apiClient';
import type { ChangeRequest, NewChangeRequestData } from '../types';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Helper for list responses if pagination is used by default by apiClient
const processListResponse = <T>(response: PaginatedResponse<T> | T[]): T[] => {
  // Check if response.data itself is the array (direct list)
  if (Array.isArray(response)) {
    return response as T[];
  }
  // Check for DRF's default paginated structure
  if (response && Array.isArray((response as PaginatedResponse<T>).results)) {
    return (response as PaginatedResponse<T>).results;
  }
  // Fallback if the structure is unexpected, though this should ideally not happen
  // Or, if sometimes the data is directly under .data without 'results'
  console.warn("Unexpected API response structure for list:", response);
  return []; // Or handle error appropriately
};

export const getChangeRequests = async (): Promise<ChangeRequest[]> => {
  const response = await apiClient<PaginatedResponse<ChangeRequest>>('/changes/requests/', '', { method: 'GET' }); // Removed /api prefix
  return processListResponse<ChangeRequest>(response);
};

export const getChangeRequestById = async (id: number): Promise<ChangeRequest> => {
  return await apiClient<ChangeRequest>(`/changes/requests/${id}/`, '', { method: 'GET' }); // Removed /api prefix
};

export const createChangeRequest = async (data: NewChangeRequestData): Promise<ChangeRequest> => {
  return await apiClient<ChangeRequest>('/changes/requests/', '', { // Removed /api prefix
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const updateChangeRequest = async (id: number, data: Partial<NewChangeRequestData>): Promise<ChangeRequest> => {
  return await apiClient<ChangeRequest>(`/changes/requests/${id}/`, '', { // Removed /api prefix
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const deleteChangeRequest = async (id: number): Promise<void> => {
  await apiClient<void>(`/changes/requests/${id}/`, '', { method: 'DELETE' }); // Removed /api prefix
};
