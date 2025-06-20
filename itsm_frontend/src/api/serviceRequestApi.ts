// itsm_frontend/src/api/serviceRequestApi.ts

import type {
  ServiceRequest,
  NewServiceRequestData,
  ServiceRequestStatus,
  // Added Raw types here
  RawServiceRequestResponse,
  PaginatedServiceRequestsResponse,
} from '../modules/service-requests/types/ServiceRequestTypes';

// Define the type for the authenticatedFetch function
type AuthenticatedFetch = (
  endpoint: string,
  options?: RequestInit,
) => Promise<unknown>; // Changed Promise<any> to Promise<unknown>

const SERVICE_REQUESTS_ENDPOINT = '/service-requests'; // Removed trailing slash

// Interface definitions moved to ServiceRequestTypes.ts

// transformServiceRequestResponse remains the same

const transformServiceRequestResponse = (
  rawRequest: RawServiceRequestResponse,
): ServiceRequest => {
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
    catalog_item_id: rawRequest.catalog_item, // Map from rawRequest.catalog_item (ID)
    catalog_item_name: rawRequest.catalog_item_name || null, // Map from rawRequest.catalog_item_name
  };
};

export const getServiceRequests = async (
  authenticatedFetch: AuthenticatedFetch,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ results: ServiceRequest[]; count: number }> => {
  const endpoint = `${SERVICE_REQUESTS_ENDPOINT}/requests/?page=${page}&page_size=${pageSize}`;
  const rawData = (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as PaginatedServiceRequestsResponse;
  return {
    results: rawData.results.map(transformServiceRequestResponse),
    count: rawData.count,
  };
};

export const createServiceRequest = async (
  authenticatedFetch: AuthenticatedFetch,
  newRequestData: NewServiceRequestData,
): Promise<ServiceRequest> => {
  const endpoint = `${SERVICE_REQUESTS_ENDPOINT}/requests/`;
  const rawResponse = (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRequestData),
  })) as RawServiceRequestResponse;
  return transformServiceRequestResponse(rawResponse);
};

export const getServiceRequestById = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number | string,
): Promise<ServiceRequest> => {
  const endpoint = `${SERVICE_REQUESTS_ENDPOINT}/requests/${id}/`;
  const rawData = (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as RawServiceRequestResponse;
  return transformServiceRequestResponse(rawData);
};

export const updateServiceRequest = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number | string,
  updatedData: Partial<NewServiceRequestData> & {
    status?: ServiceRequestStatus;
  },
): Promise<ServiceRequest> => {
  const endpoint = `${SERVICE_REQUESTS_ENDPOINT}/requests/${id}/`;
  const rawResponse = (await authenticatedFetch(endpoint, {
    method: 'PATCH', // Assuming PATCH is preferred for partial updates
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData),
  })) as RawServiceRequestResponse;
  return transformServiceRequestResponse(rawResponse);
};

export const deleteServiceRequest = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number | string,
): Promise<void> => {
  const endpoint = `${SERVICE_REQUESTS_ENDPOINT}/requests/${id}/`;
  await authenticatedFetch(endpoint, {
    method: 'DELETE',
  });
};
