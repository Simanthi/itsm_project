// itsm_frontend/src/api/assetApi.ts

// Define the type for the authenticatedFetch function
type AuthenticatedFetch = (
  endpoint: string,
  options?: RequestInit,
) => Promise<any>;

// --- Common Types ---
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Basic User representation for nested display
export interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  // Add other fields if your UserSerializer exposes them and they are needed
}

// --- AssetCategory Types ---
export interface AssetCategory {
  id: number;
  name: string;
  description?: string | null;
}
export type AssetCategoryData = Omit<AssetCategory, 'id'>;

// --- Location Types ---
export interface Location {
  id: number;
  name: string;
  description?: string | null;
}
export type LocationData = Omit<Location, 'id'>;

// --- Vendor Types ---
export interface Vendor {
  id: number;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
}
export type VendorData = Omit<Vendor, 'id'>;

// --- Asset Types ---
export interface Asset {
  id: number;
  name: string;
  asset_tag: string;
  serial_number?: string | null;
  status: string; // Consider a more specific string literal union if statuses are fixed
  category?: AssetCategory | null;
  location?: Location | null;
  vendor?: Vendor | null;
  assigned_to?: User | null;
  purchase_date?: string | null;
  warranty_end_date?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetData {
  name: string;
  asset_tag: string;
  serial_number?: string | null;
  status: string;
  category_id?: number | null; // Use category_id for POST/PUT
  location_id?: number | null;
  vendor_id?: number | null;
  assigned_to_id?: number | null;
  purchase_date?: string | null;
  warranty_end_date?: string | null;
  description?: string | null;
}

// --- API Function Parameters ---
export interface GetListParams {
  page?: number;
  pageSize?: number;
}

export interface GetAssetsParams extends GetListParams {
  filters?: Record<string, string | number | boolean>; // Refined to include boolean for filter values
  sortBy?: string; // e.g., "name", "asset_tag"
  sortOrder?: 'asc' | 'desc'; // Default to 'asc' if not provided
}

const API_BASE_PATH = '/assets'; // Corrected: Relative to global API_BASE_URL (e.g., /api)

// --- AssetCategory Functions ---

export const getAssetCategories = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetListParams,
): Promise<PaginatedResponse<AssetCategory>> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('page_size', params.pageSize.toString()); // Standard DRF page size param

  const endpoint = `${API_BASE_PATH}/categories/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

export const createAssetCategory = async (
  authenticatedFetch: AuthenticatedFetch,
  categoryData: AssetCategoryData,
): Promise<AssetCategory> => {
  const endpoint = `${API_BASE_PATH}/categories/`;
  return await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categoryData),
  });
};

export const updateAssetCategory = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  categoryData: Partial<AssetCategoryData>,
): Promise<AssetCategory> => {
  const endpoint = `${API_BASE_PATH}/categories/${id}/`;
  return await authenticatedFetch(endpoint, {
    method: 'PUT', // Or PATCH if partial updates are preferred and supported
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categoryData),
  });
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
  if (params?.pageSize) queryParams.append('page_size', params.pageSize.toString());

  const endpoint = `${API_BASE_PATH}/locations/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

export const createLocation = async (
  authenticatedFetch: AuthenticatedFetch,
  locationData: LocationData,
): Promise<Location> => {
  const endpoint = `${API_BASE_PATH}/locations/`;
  return await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(locationData),
  });
};

export const updateLocation = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  locationData: Partial<LocationData>,
): Promise<Location> => {
  const endpoint = `${API_BASE_PATH}/locations/${id}/`;
  return await authenticatedFetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(locationData),
  });
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
  if (params?.pageSize) queryParams.append('page_size', params.pageSize.toString());

  const endpoint = `${API_BASE_PATH}/vendors/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

export const createVendor = async (
  authenticatedFetch: AuthenticatedFetch,
  vendorData: VendorData,
): Promise<Vendor> => {
  const endpoint = `${API_BASE_PATH}/vendors/`;
  return await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendorData),
  });
};

export const updateVendor = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  vendorData: Partial<VendorData>,
): Promise<Vendor> => {
  const endpoint = `${API_BASE_PATH}/vendors/${id}/`;
  return await authenticatedFetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendorData),
  });
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
  if (params?.pageSize) queryParams.append('page_size', params.pageSize.toString());
  if (params?.sortBy) {
    queryParams.append('ordering', params.sortOrder === 'desc' ? `-${params.sortBy}` : params.sortBy);
  }
  if (params?.filters) {
    for (const key in params.filters) {
      if (params.filters[key] !== undefined && params.filters[key] !== null) {
        queryParams.append(key, String(params.filters[key]));
      }
    }
  }

  const endpoint = `${API_BASE_PATH}/assets/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

export const getAssetById = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<Asset> => {
  const endpoint = `${API_BASE_PATH}/assets/${id}/`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

export const createAsset = async (
  authenticatedFetch: AuthenticatedFetch,
  assetData: AssetData,
): Promise<Asset> => {
  const endpoint = `${API_BASE_PATH}/assets/`;
  return await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assetData),
  });
};

export const updateAsset = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  assetData: Partial<AssetData>, // Use Partial for updates
): Promise<Asset> => {
  const endpoint = `${API_BASE_PATH}/assets/${id}/`;
  return await authenticatedFetch(endpoint, {
    method: 'PUT', // Or PATCH
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assetData),
  });
};

export const deleteAsset = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<void> => {
  const endpoint = `${API_BASE_PATH}/assets/${id}/`;
  await authenticatedFetch(endpoint, { method: 'DELETE' });
};
