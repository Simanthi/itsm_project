// itsm_frontend/src/api/serviceRequestApi.ts
import { API_BASE_URL } from '../config'; // FIX: Correctly import API_BASE_URL
import { type ServiceRequest, type NewServiceRequestData } from '../modules/service-requests/types/ServiceRequestTypes';

// FIX: Renamed protectedApiCall to authFetch and made it exportable
// This function handles authenticated fetch requests
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
    } catch (_) { // FIX: Use '_' for unused catch variable
      errorDetail = `${errorDetail} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const getServiceRequests = async (token: string): Promise<ServiceRequest[]> => {
  return authFetch<ServiceRequest[]>(`${API_BASE_URL}/service-requests/requests/`, 'GET', token);
};

export const getServiceRequestById = async (id: string, token: string): Promise<ServiceRequest> => {
  return authFetch<ServiceRequest>(`${API_BASE_URL}/service-requests/requests/${id}/`, 'GET', token);
};

export const createServiceRequest = async (data: NewServiceRequestData, token: string): Promise<ServiceRequest> => {
  return authFetch<ServiceRequest>(`${API_BASE_URL}/service-requests/requests/`, 'POST', token, data);
};

export const updateServiceRequest = async (requestId: string, data: Partial<NewServiceRequestData>, token: string): Promise<ServiceRequest> => {
  // FIX: Data for update should match what the backend expects, often a subset of NewServiceRequestData
  return authFetch<ServiceRequest>(`${API_BASE_URL}/service-requests/requests/${requestId}/`, 'PATCH', token, data);
};

export const deleteServiceRequest = async (id: string, token: string): Promise<void> => {
  return authFetch<void>(`${API_BASE_URL}/service-requests/requests/${id}/`, 'DELETE', token);
};