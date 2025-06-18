// import { apiClient } from '../../../api/apiClient'; // No longer directly used
import type { ChangeRequest, NewChangeRequestData } from '../types';
import type { AuthenticatedFetch } from '../../../context/auth/AuthContextDefinition'; // Import AuthenticatedFetch

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

export const getChangeRequests = async (authenticatedFetch: AuthenticatedFetch): Promise<ChangeRequest[]> => {
  const response = await authenticatedFetch<PaginatedResponse<ChangeRequest> | ChangeRequest[]>('/changes/requests/', { method: 'GET' });
  return processListResponse<ChangeRequest>(response);
};

export const getChangeRequestById = async (authenticatedFetch: AuthenticatedFetch, id: number): Promise<ChangeRequest> => {
  return await authenticatedFetch<ChangeRequest>(`/changes/requests/${id}/`, { method: 'GET' });
};

export const createChangeRequest = async (authenticatedFetch: AuthenticatedFetch, data: NewChangeRequestData): Promise<ChangeRequest> => {
  return await authenticatedFetch<ChangeRequest>('/changes/requests/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const updateChangeRequest = async (authenticatedFetch: AuthenticatedFetch, id: number, data: Partial<NewChangeRequestData>): Promise<ChangeRequest> => {
  return await authenticatedFetch<ChangeRequest>(`/changes/requests/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const deleteChangeRequest = async (authenticatedFetch: AuthenticatedFetch, id: number): Promise<void> => {
  await authenticatedFetch<void>(`/changes/requests/${id}/`, { method: 'DELETE' });
};
