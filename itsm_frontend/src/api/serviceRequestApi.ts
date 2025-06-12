// itsm_frontend/src/api/serviceRequestApi.ts

// Define your backend API base URL
const API_BASE_URL = 'http://localhost:8000/api/service-requests';

import type { ServiceRequest, NewServiceRequestData, ServiceRequestStatus, ServiceRequestCategory, ServiceRequestPriority } from '../modules/service-requests/types/ServiceRequestTypes';

// --- Helper Interfaces for Raw API Responses ---
interface RawUserResponse {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface RawServiceRequestResponse {
  id: number;
  request_id: string;
  title: string;
  description: string;
  requested_by: RawUserResponse; // This is a nested object from backend
  assigned_to: RawUserResponse | null; // This is a nested object from backend
  status: ServiceRequestStatus;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

// Define the structure of the paginated API response
interface PaginatedServiceRequestsResponse {
  count: number; // Total number of items across all pages
  next: string | null; // URL for the next page
  previous: string | null; // URL for the previous page
  results: RawServiceRequestResponse[]; // Array of service requests for the current page
}


// Helper for making authenticated fetch requests
async function authFetch<T>(url: string, token: string, options?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // Assuming JWT Bearer token
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`);
  }

  // Handle 204 No Content for successful deletions/updates where no body is returned
  if (response.status === 204) {
    return null as T; // Return null or a meaningful empty value for no content
  }

  return response.json();
}

// Updated transform function to include requested_by_id
const transformServiceRequestResponse = (rawRequest: RawServiceRequestResponse): ServiceRequest => {
  return {
    id: rawRequest.id,
    request_id: rawRequest.request_id,
    title: rawRequest.title,
    description: rawRequest.description,
    status: rawRequest.status,
    category: rawRequest.category,
    priority: rawRequest.priority,
    resolution_notes: rawRequest.resolution_notes,
    created_at: rawRequest.created_at,
    updated_at: rawRequest.updated_at,
    resolved_at: rawRequest.resolved_at,
    requested_by_username: rawRequest.requested_by.username,
    requested_by_id: rawRequest.requested_by.id, // Add requested_by_id from the nested object
    assigned_to_username: rawRequest.assigned_to?.username || null,
    assigned_to_id: rawRequest.assigned_to?.id || null,
  };
};

/**
 * Fetches service requests with pagination.
 * @param token Authentication token.
 * @param page The page number to fetch (1-indexed).
 * @param pageSize The number of items per page.
 * @returns A promise that resolves to an object containing results and total count.
 */
// Modified getServiceRequests to accept pagination parameters and return PaginatedServiceRequestsResponse structure
export const getServiceRequests = async (token: string, page: number = 1, pageSize: number = 10): Promise<{ results: ServiceRequest[]; count: number }> => {
  const url = `${API_BASE_URL}/requests/?page=${page}&page_size=${pageSize}`;
  const rawData = await authFetch<PaginatedServiceRequestsResponse>(url, token); // Expect paginated response

  return {
    results: rawData.results.map(transformServiceRequestResponse),
    count: rawData.count,
  };
};

/**
 * Creates a new service request.
 * @param newRequestData Data for the new service request.
 * @param token Authentication token.
 * @returns A promise that resolves to the created ServiceRequest object.
 */
export const createServiceRequest = async (newRequestData: NewServiceRequestData, token: string): Promise<ServiceRequest> => {
  const url = `${API_BASE_URL}/requests/`;
  const rawResponse = await authFetch<RawServiceRequestResponse>(url, token, {
    method: 'POST',
    body: JSON.stringify(newRequestData),
  });
  return transformServiceRequestResponse(rawResponse);
};

/**
 * Fetches a single service request by its ID.
 * @param id The ID of the service request (can be number or string request_id).
 * @param token Authentication token.
 * @returns A promise that resolves to the ServiceRequest object.
 */
export const getServiceRequestById = async (id: number | string, token: string): Promise<ServiceRequest> => {
  const url = `${API_BASE_URL}/requests/${id}/`; // Backend expects request_id string
  const rawData = await authFetch<RawServiceRequestResponse>(url, token);
  return transformServiceRequestResponse(rawData);
};

/**
 * Updates an existing service request.
 * @param id The ID of the service request to update (can be number or string request_id).
 * @param updatedData Partial data to update.
 * @param token Authentication token.
 * @returns A promise that resolves to the updated ServiceRequest object.
 */
export const updateServiceRequest = async (id: number | string, updatedData: Partial<NewServiceRequestData> & { status?: ServiceRequestStatus }, token: string): Promise<ServiceRequest> => {
  const url = `${API_BASE_URL}/requests/${id}/`;
  const rawResponse = await authFetch<RawServiceRequestResponse>(url, token, {
    method: 'PATCH', // Use PATCH for partial updates
    body: JSON.stringify(updatedData),
  });
  return transformServiceRequestResponse(rawResponse);
};

/**
 * Deletes a service request by its ID.
 * @param id The ID of the service request to delete (can be number or string request_id).
 * @param token Authentication token.
 * @returns A promise that resolves when the request is successfully deleted (no content).
 */
export const deleteServiceRequest = async (id: number | string, token: string): Promise<void> => {
  const url = `${API_BASE_URL}/requests/${id}/`;
  await authFetch<void>(url, token, {
    method: 'DELETE',
  });
};