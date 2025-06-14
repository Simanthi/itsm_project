// itsm_frontend/src/api/serviceRequestApi.ts

// 👇 CHANGE 1: Import our new centralized apiClient
import { apiClient } from './apiClient';
import type { ServiceRequest, NewServiceRequestData, ServiceRequestStatus, ServiceRequestCategory, ServiceRequestPriority } from '../modules/service-requests/types/ServiceRequestTypes';

// We no longer need the base URL here, as apiClient handles it.
const SERVICE_REQUESTS_ENDPOINT = '/service-requests';

// ... (interface definitions remain the same)
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


// 👇 CHANGE 2: The local 'authFetch' helper function is now removed.

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
    assigned_to_username: rawRequest.assigned_to?.username || null,
    assigned_to_id: rawRequest.assigned_to?.id || null,
  };
};

export const getServiceRequests = async (token: string, page: number = 1, pageSize: number = 10): Promise<{ results: ServiceRequest[]; count: number }> => {
  // 👇 CHANGE 3: Use the new apiClient and pass just the endpoint.
  const endpoint = `${SERVICE_REQUESTS_ENDPOINT}/requests/?page=${page}&page_size=${pageSize}`;
  const rawData = await apiClient<PaginatedServiceRequestsResponse>(endpoint, token);
  return {
    results: rawData.results.map(transformServiceRequestResponse),
    count: rawData.count,
  };
};

export const createServiceRequest = async (newRequestData: NewServiceRequestData, token: string): Promise<ServiceRequest> => {
  const endpoint = `${SERVICE_REQUESTS_ENDPOINT}/requests/`;
  // 👇 CHANGE 4: Use the new apiClient for the POST request.
  const rawResponse = await apiClient<RawServiceRequestResponse>(endpoint, token, {
    method: 'POST',
    body: JSON.stringify(newRequestData),
  });
  return transformServiceRequestResponse(rawResponse);
};

export const getServiceRequestById = async (id: number | string, token: string): Promise<ServiceRequest> => {
  const endpoint = `${SERVICE_REQUESTS_ENDPOINT}/requests/${id}/`;
  const rawData = await apiClient<RawServiceRequestResponse>(endpoint, token);
  return transformServiceRequestResponse(rawData);
};

export const updateServiceRequest = async (id: number | string, updatedData: Partial<NewServiceRequestData> & { status?: ServiceRequestStatus }, token: string): Promise<ServiceRequest> => {
  const endpoint = `${SERVICE_REQUESTS_ENDPOINT}/requests/${id}/`;
  const rawResponse = await apiClient<RawServiceRequestResponse>(endpoint, token, {
    method: 'PATCH',
    body: JSON.stringify(updatedData),
  });
  return transformServiceRequestResponse(rawResponse);
};

export const deleteServiceRequest = async (id: number | string, token: string): Promise<void> => {
  const endpoint = `${SERVICE_REQUESTS_ENDPOINT}/requests/${id}/`;
  await apiClient<void>(endpoint, token, {
    method: 'DELETE',
  });
};