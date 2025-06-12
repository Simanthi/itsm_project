// itsm_frontend/src/api/serviceRequestApi.ts

import { API_BASE_URL } from '../config'; // Import the base URL from config.ts
import { type ServiceRequest, type NewServiceRequestData, type ServiceRequestCategory, type ServiceRequestPriority, type ServiceRequestStatus } from '../modules/service-requests/types/ServiceRequestTypes';

interface RawUserResponse {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

// Define the structure of the paginated API response
interface PaginatedServiceRequestsResponse {
  count: number; // Total number of items across all pages
  next: string | null; // URL for the next page
  previous: string | null; // URL for the previous page
  results: RawServiceRequestResponse[]; // Array of service requests for the current page
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

export async function authFetch<T>(url: string, method: string, token: string, body?: object | null): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const config: RequestInit = {
    method: method,
    headers: headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorDetail = `API error: ${response.status}`;
    try {
      const errorJson = await response.json();
      errorDetail = `${errorDetail}: ${JSON.stringify(errorJson)}`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      errorDetail = `${errorDetail} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T; // Return an empty object for No Content responses
  }

  return response.json();
}

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
    assigned_to_username: rawRequest.assigned_to?.username || null,
    assigned_to_id: rawRequest.assigned_to?.id || null,
  };
};

// Modify getServiceRequests to accept pagination parameters and return total count
export const getServiceRequests = async (token: string, page: number = 1, pageSize: number = 10): Promise<{ results: ServiceRequest[]; count: number }> => {
  // FIX: Prepend 'service-requests/' to the path, correctly building the URL
  const url = `${API_BASE_URL}/service-requests/requests/?page=${page}&page_size=${pageSize}`;
  const rawData = await authFetch<PaginatedServiceRequestsResponse>(url, 'GET', token); // Expect paginated response

  return {
    results: rawData.results.map(transformServiceRequestResponse),
    count: rawData.count,
  };
};

export const getServiceRequestById = async (id: string, token: string): Promise<ServiceRequest> => {
  // FIX: Prepend 'service-requests/' to the path
  const rawData = await authFetch<RawServiceRequestResponse>(`${API_BASE_URL}/service-requests/requests/${id}/`, 'GET', token);
  return transformServiceRequestResponse(rawData);
};

export const createServiceRequest = async (data: NewServiceRequestData, token: string): Promise<ServiceRequest> => {
  // FIX: Prepend 'service-requests/' to the path
  const rawResponse = await authFetch<RawServiceRequestResponse>(`${API_BASE_URL}/service-requests/requests/`, 'POST', token, data);
  return transformServiceRequestResponse(rawResponse);
};

export const updateServiceRequest = async (requestId: string, data: Partial<NewServiceRequestData>, token: string): Promise<ServiceRequest> => {
  // FIX: Prepend 'service-requests/' to the path
  const rawResponse = await authFetch<RawServiceRequestResponse>(`${API_BASE_URL}/service-requests/requests/${requestId}/`, 'PATCH', token, data);
  return transformServiceRequestResponse(rawResponse);
};

export const deleteServiceRequest = async (id: string, token: string): Promise<void> => {
  // FIX: Prepend 'service-requests/' to the path
  return authFetch<void>(`${API_BASE_URL}/service-requests/requests/${id}/`, 'DELETE', token);
};
