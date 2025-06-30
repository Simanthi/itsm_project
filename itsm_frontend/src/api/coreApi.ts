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
  params?: { page?: number; pageSize?: number } // To match expected signature for GenericApiAutocomplete
): Promise<PaginatedGroupResponse | AuthGroup[]> => { // To match GenericApiAutocomplete's expected return
  // const queryParams = new URLSearchParams();
  // if (search) queryParams.append('search', search);
  // if (params?.page) queryParams.append('page', String(params.page));
  // if (params?.pageSize) queryParams.append('page_size', String(params.pageSize));
  // const endpoint = `${API_CORE_BASE_PATH}/groups/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  // console.log(`Placeholder: Would fetch from ${endpoint}`);

  // For now, returning a dummy response structure or an empty array.
  // Replace with actual API call when backend endpoint is ready.
  console.warn(
    `getAuthGroups is using placeholder data. Backend endpoint required at /api/core/groups/ or similar for django.contrib.auth.models.Group. Search term: ${search}`
  );

  // Simulate a paginated response structure if your GenericApiAutocomplete expects it
  // Otherwise, just return AuthGroup[]
  const placeholderGroups: AuthGroup[] = [
    // { id: 1, name: 'Admins (Placeholder)' },
    // { id: 2, name: 'Editors (Placeholder)' }
  ];

  // If GenericApiAutocomplete handles both PaginatedResponse and T[], returning T[] is simpler for placeholder
  // return placeholderGroups;

  // If PaginatedResponse is strictly needed by GenericApiAutocomplete:
   return Promise.resolve({
     count: placeholderGroups.length,
     next: null,
     previous: null,
     results: placeholderGroups,
   });
};
