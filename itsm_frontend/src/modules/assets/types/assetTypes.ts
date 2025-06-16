// itsm_frontend/src/modules/assets/types/assetTypes.ts

// Define the type for the authenticatedFetch function
// This could be a shared type, but for now, keeping it module-specific if not already global.
export type AuthenticatedFetch = (
  endpoint: string,
  options?: RequestInit,
) => Promise<unknown>;

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
