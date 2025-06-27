// itsm_frontend/src/api/genericIomApi.ts

import type { AuthenticatedFetch } from '../context/auth/AuthContext'; // Assuming this type is defined here
import type { PaginatedResponse } from '../types/apiTypes'; // Assuming a global PaginatedResponse type

import type {
  IOMCategory,
  IOMTemplate,
  IOMTemplateCreateData,
  IOMTemplateUpdateData,
  GetIomTemplatesParams,
  // GenericIOM related types would also go here or in a separate section if this file grows
} from '../modules/iomTemplateAdmin/types/iomTemplateAdminTypes'; // Path to the new types

const API_GENERIC_IOM_BASE_PATH = '/api/generic-iom';

// --- IOM Category API Functions ---

export const getIomCategories = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: { page?: number; pageSize?: number; ordering?: string }
): Promise<PaginatedResponse<IOMCategory>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.pageSize) queryParams.append('page_size', String(params.pageSize));
  else queryParams.append('page_size', '100'); // Default to fetching many for dropdowns
  if (params?.ordering) queryParams.append('ordering', params.ordering);

  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/categories/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedResponse<IOMCategory>;
};

// CRUD for categories might be admin-only and handled via Django admin,
// but if frontend management is needed:
// export const createIomCategory = async ( authenticatedFetch: AuthenticatedFetch, data: Pick<IOMCategory, 'name' | 'description'>): Promise<IOMCategory> => { ... }
// export const updateIomCategory = async ( authenticatedFetch: AuthenticatedFetch, id: number, data: Partial<Pick<IOMCategory, 'name' | 'description'>>): Promise<IOMCategory> => { ... }
// export const deleteIomCategory = async ( authenticatedFetch: AuthenticatedFetch, id: number): Promise<void> => { ... }


// --- IOM Template API Functions ---

export const getIomTemplates = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetIomTemplatesParams
): Promise<PaginatedResponse<IOMTemplate>> => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'pageSize') queryParams.append('page_size', String(value));
        else if (key === 'category_id') queryParams.append('category', String(value)); // map to backend param
        else queryParams.append(key, String(value));
      }
    });
  }
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/templates/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedResponse<IOMTemplate>;
};

export const getIomTemplateById = async (
  authenticatedFetch: AuthenticatedFetch,
  templateId: number
): Promise<IOMTemplate> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/templates/${templateId}/`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as IOMTemplate;
};

export const createIomTemplate = async (
  authenticatedFetch: AuthenticatedFetch,
  data: IOMTemplateCreateData
): Promise<IOMTemplate> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/templates/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })) as IOMTemplate;
};

export const updateIomTemplate = async (
  authenticatedFetch: AuthenticatedFetch,
  templateId: number,
  data: IOMTemplateUpdateData
): Promise<IOMTemplate> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/templates/${templateId}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'PATCH', // Use PATCH for partial updates
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })) as IOMTemplate;
};

export const deleteIomTemplate = async (
  authenticatedFetch: AuthenticatedFetch,
  templateId: number
): Promise<void> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/templates/${templateId}/`;
  await authenticatedFetch(endpoint, { method: 'DELETE' });
};


// --- GenericIOM Instance API Functions ---
// These would be added later when implementing GenericIOM forms/lists.
// For now, this file focuses on Template and Category management APIs.
// Example:
// import { GenericIOM, GenericIOMCreateData, ... } from '../modules/iomTemplateAdmin/types/iomTemplateAdminTypes';
// export const createGenericIom = async (authenticatedFetch: AuthenticatedFetch, data: GenericIOMCreateData): Promise<GenericIOM> => { ... }
// ... etc. ...
