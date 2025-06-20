// itsm_frontend/src/modules/service-requests/types/ServiceRequestTypes.ts

// Define the types for various service request fields
export type ServiceRequestStatus =
  | 'new'
  | 'in_progress'
  | 'pending_approval'
  | 'resolved'
  | 'closed'
  | 'cancelled';
export type ServiceRequestCategory =
  | 'software'
  | 'hardware'
  | 'network'
  | 'information'
  | 'other'
  | 'account'
  | 'printer'
  | 'system';
export type ServiceRequestPriority = 'low' | 'medium' | 'high';

// Interface for the detailed Service Request object (as received from API or for display)
export interface ServiceRequest {
  id: number; // Primary key from the database
  request_id: string; // Human-readable, unique identifier (e.g., SR-AA-0001)
  title: string;
  description: string;
  status: ServiceRequestStatus;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null; // Optional, as it might not be resolved yet
  requested_by_username: string; // Username of the user who requested it
  // FIX: Add requested_by_id to ServiceRequest interface
  requested_by_id: number; // The ID of the user who requested it (needed for form population)
  assigned_to_username: string | null; // Username of the user it's assigned to
  assigned_to_id: number | null; // The ID of the user it's assigned to (for API submission)
  catalog_item_id?: number | null; // Optional ID of the linked catalog item
  catalog_item_name?: string | null; // Optional name of the linked catalog item
}

// Interface for creating a new service request (payload for POST)
// This should match the expected payload of your backend's create endpoint
export interface NewServiceRequestData {
  title: string;
  description: string;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
  requested_by_id: number; // Expects ID for the backend
  assigned_to_id: number | null; // Expects ID for the backend, can be null
  catalog_item_id?: number | null; // Allow associating on create
}

// Interface for updating an existing service request (payload for PATCH/PUT)
// This should contain only the fields that can be updated.
// Currently, ServiceRequestForm sends all fields in its state as Partial<NewServiceRequestData>
// + status. Ensure this aligns with what your backend expects for PATCH.
export type UpdateServiceRequestData = Partial<NewServiceRequestData> & {
  status?: ServiceRequestStatus; // Status is often updatable
};

// Raw response types from the API, before transformation
export interface RawUserResponse {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface RawServiceRequestResponse {
  id: number;
  request_id: string;
  title: string;
  description: string;
  requested_by: RawUserResponse;
  assigned_to: RawUserResponse | null;
  status: ServiceRequestStatus;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  catalog_item: number | null; // This will be the ID from the backend
  catalog_item_name?: string | null; // This will be the name, potentially from a related field
}

export interface PaginatedServiceRequestsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RawServiceRequestResponse[];
}
