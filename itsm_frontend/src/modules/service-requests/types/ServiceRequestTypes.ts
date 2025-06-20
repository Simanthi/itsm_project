// itsm_frontend/src/modules/service-requests/types/ServiceRequestTypes.ts

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

export interface ServiceRequest {
  id: number;
  request_id: string;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  requested_by_username: string;
  requested_by_id: number;
  assigned_to_username: string | null;
  assigned_to_id: number | null;
  catalog_item_id?: number | null; // Ensure this is saved
  catalog_item_name?: string | null; // Ensure this is saved
}

export interface NewServiceRequestData {
  title: string;
  description: string;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
  requested_by_id: number;
  assigned_to_id: number | null;
  catalog_item_id?: number | null;
}

export type UpdateServiceRequestData = Partial<NewServiceRequestData> & {
  status?: ServiceRequestStatus;
};

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
  catalog_item: number | null; // Ensure this is saved - ID from backend
  catalog_item_name?: string | null; // Ensure this is saved - Name from backend
}

export interface PaginatedServiceRequestsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RawServiceRequestResponse[];
}
