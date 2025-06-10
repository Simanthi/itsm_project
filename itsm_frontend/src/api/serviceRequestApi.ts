// itsm_frontend/src/api/serviceRequestApi.ts
import type { ServiceRequest, NewServiceRequestData } from '../modules/service-requests/types/ServiceRequestTypes';
interface BackendUser {
  id: number;
  username: string;
  is_staff: boolean; // Assuming your backend sends this field for IT staff check
  // Add other relevant fields if needed, e.g., email, first_name, last_name, profile data etc.
}
// IMPORTANT: Make sure this URL matches your Django backend's service request API endpoint
const API_BASE_URL = 'http://localhost:8000/api/service-requests/';



// Helper to handle API responses and throw errors
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})); // Try parsing, but don't fail if not JSON
    const errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData) || 'An unknown API error occurred.';
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Fetches all service requests from the backend.
 * @param token The authentication token for the request.
 */
export async function getServiceRequests(token: string): Promise<ServiceRequest[]> {
  const response = await fetch(API_BASE_URL, {
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleApiResponse<ServiceRequest[]>(response);
}

/**
 * Fetches a single service request by its ID.
 * @param id The ID of the service request.
 * @param token The authentication token.
 */
export async function getServiceRequestById(id: number, token: string): Promise<ServiceRequest> {
  const response = await fetch(`${API_BASE_URL}${id}/`, { // CORRECTED LINE
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleApiResponse<ServiceRequest>(response);
}

/**
 * Creates a new service request.
 * @param data The data for the new service request.
 * @param token The authentication token.
 */
export async function createServiceRequest(data: NewServiceRequestData, token: string): Promise<ServiceRequest> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse<ServiceRequest>(response);
}

/**
 * Updates an existing service request.
 * @param id The ID of the service request to update.
 * @param data The partial data to update the service request.
 * @param token The authentication token.
 */
export async function updateServiceRequest(id: number, data: Partial<ServiceRequest>, token: string): Promise<ServiceRequest> {
  const response = await fetch(`${API_BASE_URL}${id}/`, {
    method: 'PATCH', // Use PATCH for partial updates, PUT for full replacement
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse<ServiceRequest>(response);
}

/**
 * Deletes a service request.
 * @param id The ID of the service request to delete.
 * @param token The authentication token.
 */
export async function deleteServiceRequest(id: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Token ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to delete service request');
  }
  // No content for successful DELETE
  return;
}

/**
 * Fetches a list of IT staff users for assignment.
 * @param token The authentication token.
 */
export async function getITStaffUsers(token: string): Promise<{ id: number; username: string; }[]> {
  const response = await fetch('http://localhost:8000/api/security-access/users/', { // Adjust URL if different
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await handleApiResponse<BackendUser[]>(response); // <-- CHANGED HERE: Use BackendUser[]
  // Filter for users who are marked as IT staff (e.g., is_staff or a custom field)
  return data.filter(user => user.is_staff).map(user => ({ id: user.id, username: user.username }));
}