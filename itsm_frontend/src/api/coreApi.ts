// itsm_frontend/src/api/coreApi.ts

import type { AuthenticatedFetch } from '../context/auth/AuthContextDefinition';
// Assuming PaginatedResponse might not be needed here, but if other core_api list endpoints are added,
// it could be imported from a shared location e.g. '../modules/procurement/types/procurementTypes';

// Type for the response of the ContentType lookup endpoint
export interface ContentTypeInfo {
  id: number;
  app_label: string;
  model: string;
}

const API_CORE_BASE_PATH = '/api/core'; // Assuming core_api URLs are mounted under /api/core/

/**
 * Fetches ContentType information (including ID) by app_label and model_name.
 * @param authenticatedFetch The authenticated fetch function.
 * @param appLabel The application label (e.g., 'assets').
 * @param modelName The model name (e.g., 'asset').
 * @returns A Promise that resolves to ContentTypeInfo or null if not found or error.
 */
export const getContentTypeId = async (
  authenticatedFetch: AuthenticatedFetch,
  appLabel: string,
  modelName: string
): Promise<ContentTypeInfo | null> => {
  const queryParams = new URLSearchParams({
    app_label: appLabel,
    model: modelName.toLowerCase(), // Ensure model name is lowercase as expected by backend
  });
  const endpoint = `${API_CORE_BASE_PATH}/contenttypes/get-id/?${queryParams.toString()}`;

  try {
    const response = (await authenticatedFetch(endpoint, { method: 'GET' })) as ContentTypeInfo;
    // Basic check to ensure the response looks like ContentTypeInfo
    if (response && typeof response.id === 'number' && response.app_label && response.model) {
        return response;
    }
    console.error('getContentTypeId: Unexpected response structure:', response);
    return null; // Or throw a more specific error
  } catch (error: any) {
    // API client's authenticatedFetch might throw for non-2xx responses.
    // If the error is a 404, we can specifically return null.
    // This depends on how authenticatedFetch and apiClient handle errors.
    // For now, assume if an error is caught, it means not found or other issue.
    if (error?.status === 404) {
      console.warn(`ContentType not found for ${appLabel}.${modelName}`);
      return null;
    }
    console.error(`Error fetching ContentType ID for ${appLabel}.${modelName}:`, error);
    return null; // Or re-throw if the caller should handle all errors
  }
};

// Example of another core API function if needed in the future:
// export const getSomeCoreData = async (authenticatedFetch: AuthenticatedFetch): Promise<any> => {
//   const endpoint = `${API_CORE_BASE_PATH}/some-other-endpoint/`;
//   return await authenticatedFetch(endpoint);
// };

// --- Group Types and Functions ---
// Basic Group type for selection
export interface AuthGroup {
  id: number;
  name: string;
}

// Placeholder for PaginatedResponse if not imported globally
interface PaginatedGroupResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuthGroup[];
}

/**
 * Fetches a list of authentication groups.
 * TODO: This is a placeholder. A real backend endpoint (e.g., /api/core/groups/ or /api/auth/groups/)
 * and corresponding Django View/Serializer for django.contrib.auth.models.Group are needed.
 * @param authenticatedFetch The authenticated fetch function.
 * @param searchOptional Optional search string for filtering group names.
 * @param params Optional additional parameters like page, pageSize.
 * @returns A Promise that resolves to a list of AuthGroup objects.
 */
export const getAuthGroups = async (
  authenticatedFetch: AuthenticatedFetch,
  search?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params?: { page?: number; pageSize?: number }
): Promise<PaginatedGroupResponse> => {
  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search); // Backend ViewSet uses 'search' for SearchFilter
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.pageSize) queryParams.append('page_size', String(params.pageSize));

  const endpoint = `${API_CORE_BASE_PATH}/groups/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;

  try {
    const response = (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedGroupResponse;
    // Ensure the response structure matches PaginatedGroupResponse
    if (response && typeof response.count === 'number' && Array.isArray(response.results)) {
        return response;
    }
    console.error('getAuthGroups: Unexpected response structure:', response);
    // Return a valid empty paginated response on unexpected structure
    return { count: 0, next: null, previous: null, results: [] };
  } catch (error) {
    console.error('Error fetching Auth Groups:', error);
    // Return a valid empty paginated response on error
    return { count: 0, next: null, previous: null, results: [] };
  }
};
