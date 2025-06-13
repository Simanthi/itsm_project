// itsm_frontend/src/api/serviceRequestApi.ts
import { API_BASE_URL } from '../config'; // Import API_BASE_URL from central config
import type { ServiceRequest, NewServiceRequestData, ServiceRequestStatus, ServiceRequestCategory, ServiceRequestPriority } from '../modules/service-requests/types/ServiceRequestTypes';

// Use the imported API_BASE_URL to define the service requests endpoint
const SERVICE_REQUESTS_API_BASE_URL = `${API_BASE_URL}/service-requests`;

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
  requested_by: RawUserResponse;
  assigned_to: RawUserResponse | null;
  status: ServiceRequestStatus;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

interface PaginatedServiceRequestsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RawServiceRequestResponse[];
}

/**
 * Helper for making authenticated fetch requests.
 * This is duplicated in authApi.ts as well. In a larger app, you'd centralize this.
 */
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
    // If the server returns a 'detail' field (common for DRF errors) use that
    throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`);
  }

  // Handle 204 No Content for successful deletions/updates where no body is returned
  if (response.status === 204) {
    return null as T; // Return null or a meaningful empty value for no content
  }

  return response.json();
}

/**
 * Transforms a raw service request response from the API into the frontend's ServiceRequest type.
 * This function extracts nested user objects and flattens them into direct username/id fields.
 */
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
    requested_by_id: rawRequest.requested_by.id,
    assigned_to_username: rawRequest.assigned_to?.username || null, // Use optional chaining for assigned_to
    assigned_to_id: rawRequest.assigned_to?.id || null, // Use optional chaining for assigned_to
  };
};

/**
 * Fetches a paginated list of service requests.
 *
 * @param token Authentication token.
 * @param page The page number to fetch (1-indexed).
 * @param pageSize The number of items per page.
 * @returns A promise that resolves to an object containing transformed service requests and the total count.
 */
export const getServiceRequests = async (token: string, page: number = 1, pageSize: number = 10): Promise<{ results: ServiceRequest[]; count: number }> => {
  // Use SERVICE_REQUESTS_API_BASE_URL
  const url = `${SERVICE_REQUESTS_API_BASE_URL}/requests/?page=${page}&page_size=${pageSize}`;
  const rawData = await authFetch<PaginatedServiceRequestsResponse>(url, token);
  return {
    results: rawData.results.map(transformServiceRequestResponse),
    count: rawData.count,
  };
};

/**
 * Creates a new service request.
 *
 * @param newRequestData The data for the new service request.
 * @param token Authentication token.
 * @returns A promise that resolves to the created ServiceRequest.
 */
export const createServiceRequest = async (newRequestData: NewServiceRequestData, token: string): Promise<ServiceRequest> => {
  // Use SERVICE_REQUESTS_API_BASE_URL
  const url = `${SERVICE_REQUESTS_API_BASE_URL}/requests/`;
  const rawResponse = await authFetch<RawServiceRequestResponse>(url, token, {
    method: 'POST',
    body: JSON.stringify(newRequestData),
  });
  return transformServiceRequestResponse(rawResponse);
};

/**
 * Fetches a single service request by its ID (request_id).
 *
 * @param id The ID (request_id string) of the service request.
 * @param token Authentication token.
 * @returns A promise that resolves to the ServiceRequest.
 */
export const getServiceRequestById = async (id: number | string, token: string): Promise<ServiceRequest> => {
  // Use SERVICE_REQUESTS_API_BASE_URL
  const url = `${SERVICE_REQUESTS_API_BASE_URL}/requests/${id}/`;
  const rawData = await authFetch<RawServiceRequestResponse>(url, token);
  return transformServiceRequestResponse(rawData);
};

/**
 * Updates an existing service request by its ID (request_id).
 *
 * @param id The ID (request_id string) of the service request.
 * @param updatedData The partial data to update.
 * @param token Authentication token.
 * @returns A promise that resolves to the updated ServiceRequest.
 */
export const updateServiceRequest = async (id: number | string, updatedData: Partial<NewServiceRequestData> & { status?: ServiceRequestStatus }, token: string): Promise<ServiceRequest> => {
  // Use SERVICE_REQUESTS_API_BASE_URL
  const url = `${SERVICE_REQUESTS_API_BASE_URL}/requests/${id}/`;
  const rawResponse = await authFetch<RawServiceRequestResponse>(url, token, {
    method: 'PATCH',
    body: JSON.stringify(updatedData),
  });
  return transformServiceRequestResponse(rawResponse);
};

/**
 * Deletes a service request by its ID (request_id).
 *
 * @param id The ID (request_id string) of the service request.
 * @param token Authentication token.
 * @returns A promise that resolves when the deletion is successful.
 */
export const deleteServiceRequest = async (id: number | string, token: string): Promise<void> => {
  // Use SERVICE_REQUESTS_API_BASE_URL
  const url = `${SERVICE_REQUESTS_API_BASE_URL}/requests/${id}/`;
  await authFetch<void>(url, token, {
    method: 'DELETE',
  });
};
