// itsm_frontend/src/api/serviceRequestApi.ts
import { API_BASE_URL } from '../config';
import { type ServiceRequest, type NewServiceRequestData, type ServiceRequestCategory, type ServiceRequestPriority, type ServiceRequestStatus } from '../modules/service-requests/types/ServiceRequestTypes';

// Define a type for the raw service request data received directly from the backend
// This accurately reflects the nested structure of 'requested_by' and 'assigned_to'
interface RawUserResponse {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface RawServiceRequestResponse {
  id: number; // FIX: Made non-optional
  request_id: string; // FIX: Made non-optional
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

// Helper function for API calls with authentication
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
    return {} as T;
  }

  return response.json();
}

// Helper to transform raw backend ServiceRequest data to frontend ServiceRequest type
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

export const getServiceRequests = async (token: string): Promise<ServiceRequest[]> => {
  const rawData = await authFetch<RawServiceRequestResponse[]>(`${API_BASE_URL}/service-requests/requests/`, 'GET', token);
  return rawData.map(transformServiceRequestResponse);
};

export const getServiceRequestById = async (id: string, token: string): Promise<ServiceRequest> => {
  const rawData = await authFetch<RawServiceRequestResponse>(`${API_BASE_URL}/service-requests/requests/${id}/`, 'GET', token);
  return transformServiceRequestResponse(rawData);
};

export const createServiceRequest = async (data: NewServiceRequestData, token: string): Promise<ServiceRequest> => {
  const rawResponse = await authFetch<RawServiceRequestResponse>(`${API_BASE_URL}/service-requests/requests/`, 'POST', token, data);
  return transformServiceRequestResponse(rawResponse);
};

export const updateServiceRequest = async (requestId: string, data: Partial<NewServiceRequestData>, token: string): Promise<ServiceRequest> => {
  const rawResponse = await authFetch<RawServiceRequestResponse>(`${API_BASE_URL}/service-requests/requests/${requestId}/`, 'PATCH', token, data);
  return transformServiceRequestResponse(rawResponse);
};

export const deleteServiceRequest = async (id: string, token: string): Promise<void> => {
  return authFetch<void>(`${API_BASE_URL}/service-requests/requests/${id}/`, 'DELETE', token);
};