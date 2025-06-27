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
