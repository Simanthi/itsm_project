// itsm_frontend/src/modules/service-requests/types/ServiceRequestTypes.ts

export type ServiceRequestStatus = 'new' | 'in_progress' | 'pending_approval' | 'resolved' | 'closed' | 'cancelled';
export type ServiceRequestCategory = 'software' | 'hardware' | 'account' | 'network' | 'printer' | 'system' | 'information' | 'other';
export type ServiceRequestPriority = 'low' | 'medium' | 'high';

export interface ServiceRequest {
  id: number;
  request_id: string;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
  requested_by_username: string;
  assigned_to_username: string | null;
  assigned_to_id: number | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface NewServiceRequestData {
  title: string;
  description: string;
  requested_by_id: number;
  assigned_to_id: number | null;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
}