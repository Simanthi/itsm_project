// itsm_frontend/src/api/assetApi.ts

import type {
  AuthenticatedFetch,
  PaginatedResponse,
  AssetCategory,
  AssetCategoryData,
  Location,
  LocationData,
  Vendor,
  VendorData,
  Asset,
  AssetData,
  GetListParams,
  GetAssetsParams,
} from '../modules/assets/types/assetTypes';

// Re-export specific types if they are intended to be available from this API file
export type { Vendor } from '../modules/assets/types/assetTypes';

const API_BASE_PATH = '/assets'; // Corrected: Relative to global API_BASE_URL (e.g., /api)

// --- AssetCategory Functions ---

export const getAssetCategories = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetListParams,
): Promise<PaginatedResponse<AssetCategory>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize)
    queryParams.append('page_size', params.pageSize.toString()); // Standard DRF page size param

  const endpoint = `${API_BASE_PATH}/categories/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as PaginatedResponse<AssetCategory>;
};

export const createAssetCategory = async (
  authenticatedFetch: AuthenticatedFetch,
  categoryData: AssetCategoryData,
): Promise<AssetCategory> => {
  const endpoint = `${API_BASE_PATH}/categories/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categoryData),
  })) as AssetCategory;
};

export const updateAssetCategory = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  categoryData: Partial<AssetCategoryData>,
): Promise<AssetCategory> => {
  const endpoint = `${API_BASE_PATH}/categories/${id}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'PUT', // Or PATCH if partial updates are preferred and supported
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categoryData),
  })) as AssetCategory;
};

export const deleteAssetCategory = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<void> => {
  const endpoint = `${API_BASE_PATH}/categories/${id}/`;
  await authenticatedFetch(endpoint, { method: 'DELETE' });
};

// --- Location Functions ---

export const getLocations = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetListParams,
): Promise<PaginatedResponse<Location>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize)
    queryParams.append('page_size', params.pageSize.toString());

  const endpoint = `${API_BASE_PATH}/locations/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as PaginatedResponse<Location>;
};

export const createLocation = async (
  authenticatedFetch: AuthenticatedFetch,
  locationData: LocationData,
): Promise<Location> => {
  const endpoint = `${API_BASE_PATH}/locations/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(locationData),
  })) as Location;
};

export const updateLocation = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  locationData: Partial<LocationData>,
): Promise<Location> => {
  const endpoint = `${API_BASE_PATH}/locations/${id}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(locationData),
  })) as Location;
};

export const deleteLocation = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<void> => {
  const endpoint = `${API_BASE_PATH}/locations/${id}/`;
  await authenticatedFetch(endpoint, { method: 'DELETE' });
};

// --- Vendor Functions ---

export const getVendors = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetListParams,
): Promise<PaginatedResponse<Vendor>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize)
    queryParams.append('page_size', params.pageSize.toString());

  const endpoint = `${API_BASE_PATH}/vendors/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as PaginatedResponse<Vendor>;
};

export const createVendor = async (
  authenticatedFetch: AuthenticatedFetch,
  vendorData: VendorData,
): Promise<Vendor> => {
  const endpoint = `${API_BASE_PATH}/vendors/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendorData),
  })) as Vendor;
};

export const updateVendor = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  vendorData: Partial<VendorData>,
): Promise<Vendor> => {
  const endpoint = `${API_BASE_PATH}/vendors/${id}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendorData),
  })) as Vendor;
};

export const deleteVendor = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<void> => {
  const endpoint = `${API_BASE_PATH}/vendors/${id}/`;
  await authenticatedFetch(endpoint, { method: 'DELETE' });
};

// --- Asset Functions ---

export const getAssets = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetAssetsParams,
): Promise<PaginatedResponse<Asset>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize)
    queryParams.append('page_size', params.pageSize.toString());
  if (params?.sortBy) {
    queryParams.append(
      'ordering',
      params.sortOrder === 'desc' ? `-${params.sortBy}` : params.sortBy,
    );
  }
  if (params?.filters) {
    for (const key in params.filters) {
      if (params.filters[key] !== undefined && params.filters[key] !== null) {
        queryParams.append(key, String(params.filters[key]));
      }
    }
  }

  const endpoint = `${API_BASE_PATH}/assets/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as PaginatedResponse<Asset>;
};

export const getAssetById = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<Asset> => {
  const endpoint = `${API_BASE_PATH}/assets/${id}/`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as Asset;
};

export const createAsset = async (
  authenticatedFetch: AuthenticatedFetch,
  assetData: AssetData,
): Promise<Asset> => {
  const endpoint = `${API_BASE_PATH}/assets/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assetData),
  })) as Asset;
};

export const updateAsset = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  assetData: Partial<AssetData>, // Use Partial for updates
): Promise<Asset> => {
  const endpoint = `${API_BASE_PATH}/assets/${id}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'PUT', // Or PATCH
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assetData),
  })) as Asset;
};

export const deleteAsset = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<void> => {
  const endpoint = `${API_BASE_PATH}/assets/${id}/`;
  await authenticatedFetch(endpoint, { method: 'DELETE' });
};
