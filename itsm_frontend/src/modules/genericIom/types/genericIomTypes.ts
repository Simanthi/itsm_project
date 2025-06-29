// Defines types related to Generic IOM instances for the frontend.

// Assuming PaginatedResponse and AuthenticatedFetch types are globally available
// or imported into genericIomApi.ts from a shared location.

import type { IOMTemplate } from '../../iomTemplateAdmin/types/iomTemplateAdminTypes'; // For nesting template details

// Status choices for GenericIOM - should align with backend model
export type GenericIomStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'archived'
  | 'cancelled';

// Structure for the data_payload - can be any JSON object
export type IomDataPayload = Record<string, any>; // Or Record<string, unknown> for stricter typing

// Interface for a GenericIOM object received from the API
export interface GenericIOM {
  id: number;
  gim_id: string | null; // System-generated ID
  iom_template: number; // ID of the IOMTemplate
  iom_template_details?: Pick<IOMTemplate, 'id' | 'name' | 'fields_definition' | 'approval_type' | 'simple_approval_user' | 'simple_approval_group'>; // Expanded details
  subject: string;
  data_payload: IomDataPayload;
  status: GenericIomStatus;
  status_display?: string; // Read-only from backend
  created_by: number; // User ID
  created_by_username?: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  published_at?: string | null; // ISO date string

  to_users: number[]; // Array of user IDs
  to_users_details?: Array<{ id: number; username: string; first_name?: string; last_name?: string }>;
  to_groups: number[]; // Array of group IDs
  to_groups_details?: Array<{ id: number; name: string }>;

  parent_content_type?: number | null; // ContentType ID
  parent_content_type_name?: string | null; // e.g., "asset", "project"
  parent_object_id?: number | null;
  parent_record_display?: string | null; // User-friendly display of the parent record

  // Fields for simple approval tracking
  simple_approver_action_by?: number | null; // User ID
  simple_approver_action_by_username?: string | null;
  simple_approval_action_at?: string | null; // ISO date string
  simple_approval_comments?: string | null;

  // Placeholder for advanced approval steps if fetched/nested
  // approval_steps?: any[];
}

// Data for creating a new GenericIOM
export interface GenericIOMCreateData {
  iom_template: number; // ID of the IOMTemplate
  subject: string;
  data_payload: IomDataPayload;
  to_users?: number[];
  to_groups?: number[];
  parent_content_type_id?: number | null; // For GFK write
  parent_object_id?: number | null;     // For GFK write
  status?: GenericIomStatus; // Optional: backend might default to 'draft'
}

// Data for updating an existing GenericIOM (most fields optional)
export type GenericIOMUpdateData = Partial<Omit<GenericIOMCreateData, 'iom_template'>>; // Template usually not changed after creation


// Params for fetching GenericIOM list
export interface GetGenericIomsParams {
  page?: number;
  pageSize?: number;
  ordering?: string;
  status?: GenericIomStatus | GenericIomStatus[] | 'all_except_archived'; // Added 'all_except_archived'
  iom_template_id?: number;
  created_by_id?: number;
  search?: string; // For searching subject, gim_id, data_payload content
  // Add other potential filter params like date ranges
}

// --- Payloads for Custom Actions ---

export interface GenericIomSimpleActionPayload {
  comments?: string;
}

// GenericIOMPublishPayload might not be needed if it's just an action without data
// export interface GenericIOMPublishPayload {}
