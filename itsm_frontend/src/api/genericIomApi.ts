// itsm_frontend/src/api/genericIomApi.ts

import type { AuthenticatedFetch } from '../context/auth/AuthContextDefinition';
import type { PaginatedResponse } from '../modules/procurement/types/procurementTypes';

import type {
  IOMCategory,
  IOMTemplate,
  IOMTemplateCreateData,
  IOMTemplateUpdateData,
  GetIomTemplatesParams,
} from '../modules/iomTemplateAdmin/types/iomTemplateAdminTypes';

import type {
  GenericIOM,
  GenericIOMCreateData,
  GenericIOMUpdateData,
  GetGenericIomsParams,
  GenericIomSimpleActionPayload,
} from '../modules/genericIom/types/genericIomTypes';

const API_GENERIC_IOM_BASE_PATH = '/generic-iom';

// --- IOM Category API Functions ---

export const getIomCategories = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: { page?: number; pageSize?: number; ordering?: string }
): Promise<PaginatedResponse<IOMCategory>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.pageSize) queryParams.append('page_size', String(params.pageSize));
  else queryParams.append('page_size', '100');
  if (params?.ordering) queryParams.append('ordering', params.ordering);

  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/categories/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedResponse<IOMCategory>;
};

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
        else if (key === 'category_id') queryParams.append('category', String(value));
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
    method: 'PATCH',
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

export const getGenericIoms = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetGenericIomsParams
): Promise<PaginatedResponse<GenericIOM>> => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'pageSize') queryParams.append('page_size', String(value));
        else if (key === 'iom_template_id') queryParams.append('iom_template', String(value));
        else if (key === 'created_by_id') queryParams.append('created_by', String(value));
        else if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(`${key}__in`, String(v)));
        }
        else queryParams.append(key, String(value));
      }
    });
  }
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/ioms/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedResponse<GenericIOM>;
};

export const getGenericIomById = async (
  authenticatedFetch: AuthenticatedFetch,
  iomId: number
): Promise<GenericIOM> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/ioms/${iomId}/`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as GenericIOM;
};

export const createGenericIom = async (
  authenticatedFetch: AuthenticatedFetch,
  data: GenericIOMCreateData
): Promise<GenericIOM> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/ioms/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })) as GenericIOM;
};

export const updateGenericIom = async (
  authenticatedFetch: AuthenticatedFetch,
  iomId: number,
  data: GenericIOMUpdateData
): Promise<GenericIOM> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/ioms/${iomId}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })) as GenericIOM;
};

export const deleteGenericIom = async (
  authenticatedFetch: AuthenticatedFetch,
  iomId: number
): Promise<void> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/ioms/${iomId}/`;
  await authenticatedFetch(endpoint, { method: 'DELETE' });
};

// --- Custom Actions for GenericIOM ---

export const submitGenericIomForSimpleApproval = async (
  authenticatedFetch: AuthenticatedFetch,
  iomId: number,
  payload?: GenericIomSimpleActionPayload
): Promise<GenericIOM> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/ioms/${iomId}/submit_for_simple_approval/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  })) as GenericIOM;
};

export const simpleApproveGenericIom = async (
  authenticatedFetch: AuthenticatedFetch,
  iomId: number,
  payload: GenericIomSimpleActionPayload
): Promise<GenericIOM> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/ioms/${iomId}/simple_approve/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })) as GenericIOM;
};

export const simpleRejectGenericIom = async (
  authenticatedFetch: AuthenticatedFetch,
  iomId: number,
  payload: GenericIomSimpleActionPayload
): Promise<GenericIOM> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/ioms/${iomId}/simple_reject/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })) as GenericIOM;
};

export const publishGenericIom = async (
  authenticatedFetch: AuthenticatedFetch,
  iomId: number
): Promise<GenericIOM> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/ioms/${iomId}/publish/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
  })) as GenericIOM;
};

export const archiveGenericIom = async (
  authenticatedFetch: AuthenticatedFetch,
  iomId: number
): Promise<GenericIOM> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/ioms/${iomId}/archive/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
  })) as GenericIOM;
};

export const unarchiveGenericIom = async (
  authenticatedFetch: AuthenticatedFetch,
  iomId: number
): Promise<GenericIOM> => {
  const endpoint = `${API_GENERIC_IOM_BASE_PATH}/ioms/${iomId}/unarchive/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
  })) as GenericIOM;
};
