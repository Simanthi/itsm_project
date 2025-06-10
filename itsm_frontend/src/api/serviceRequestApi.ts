// itsm_frontend/src/api/serviceRequestApi.ts

// Define your backend API base URL
const API_BASE_URL = 'http://localhost:8000/api/service-requests';

// Assuming you have a ServiceRequest and NewServiceRequestData type defined in
// itsm_frontend/src/modules/service-requests/types/ServiceRequestTypes.ts
import type { ServiceRequest, NewServiceRequestData } from '../modules/service-requests/types/ServiceRequestTypes';

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

/**
 * Fetches all service requests.
 * @param token Authentication token.
 * @returns A promise that resolves to an array of ServiceRequest objects.
 */
export const getServiceRequests = async (token: string): Promise<ServiceRequest[]> => {
  // FIX: Ensure the correct endpoint for listing requests is used.
  // Based on repomix, it should be /api/service-requests/requests/
  const url = `${API_BASE_URL}/requests/`;
  const data = await authFetch<ServiceRequest[]>(url, token);
  // If your backend returns a paginated response (e.g., { results: ServiceRequest[] }),
  // you might need to return data.results here.
  // For now, assuming it returns an array directly.
  return data;
};

/**
 * Creates a new service request.
 * @param newRequestData Data for the new service request.
 * @param token Authentication token.
 * @returns A promise that resolves to the created ServiceRequest object.
 */
export const createServiceRequest = async (newRequestData: NewServiceRequestData, token: string): Promise<ServiceRequest> => {
  const url = `${API_BASE_URL}/requests/`;
  return authFetch<ServiceRequest>(url, token, {
    method: 'POST',
    body: JSON.stringify(newRequestData),
  });
};

/**
 * Fetches a single service request by its ID.
 * @param id The ID of the service request.
 * @param token Authentication token.
 * @returns A promise that resolves to the ServiceRequest object.
 */
export const getServiceRequestById = async (id: number | string, token: string): Promise<ServiceRequest> => {
  const url = `${API_BASE_URL}/requests/${id}/`;
  return authFetch<ServiceRequest>(url, token);
};

/**
 * Updates an existing service request.
 * @param id The ID of the service request to update.
 * @param updatedData Partial data to update.
 * @param token Authentication token.
 * @returns A promise that resolves to the updated ServiceRequest object.
 */
export const updateServiceRequest = async (id: number | string, updatedData: Partial<ServiceRequest>, token: string): Promise<ServiceRequest> => {
  const url = `${API_BASE_URL}/requests/${id}/`;
  return authFetch<ServiceRequest>(url, token, {
    method: 'PATCH', // Use PATCH for partial updates
    body: JSON.stringify(updatedData),
  });
};

/**
 * Deletes a service request by its ID.
 * @param id The ID of the service request to delete.
 * @param token Authentication token.
 * @returns A promise that resolves when the request is successfully deleted (no content).
 */
export const deleteServiceRequest = async (id: number | string, token: string): Promise<void> => {
  const url = `${API_BASE_URL}/requests/${id}/`;
  await authFetch<void>(url, token, {
    method: 'DELETE',
  });
};
