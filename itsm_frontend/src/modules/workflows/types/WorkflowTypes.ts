// itsm_frontend/src/modules/workflows/types/WorkflowTypes.ts

// For ContentObjectDisplay - generic representation
export interface ContentObjectDisplay {
  id: number;
  type: string; // e.g., 'changerequest'
  title?: string; // if available from serializer
  display?: string; // default string representation from serializer
  url?: string; // if available from serializer (e.g., get_absolute_url)
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export const ApprovalStatusOptions: ApprovalStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];

export type ApprovalStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';
export const ApprovalStepStatusOptions: ApprovalStepStatus[] = ['pending', 'approved', 'rejected', 'skipped'];

export interface ApprovalStep {
  id: number;
  approval_request: number; // ID of the parent ApprovalRequest
  step_order: number;
  approver: number; // User ID
  approver_username?: string | null; // Added null to match serializer
  status: ApprovalStepStatus;
  comments?: string | null;
  approved_at?: string | null; // ISO datetime string
}

export interface ApprovalRequest {
  id: number;
  title: string;
  description?: string | null;
  content_type: number; // ContentType ID (e.g., from django.contrib.contenttypes)
  object_id: number; // ID of the related object (e.g., ChangeRequest ID)
  content_object_display?: ContentObjectDisplay | null; // Populated by custom serializer field
  initiated_by: number; // User ID
  initiated_by_username?: string | null; // Added null
  current_status: ApprovalStatus;
  steps: ApprovalStep[]; // Nested steps, should be populated by serializer
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

// For submitting approval/rejection
export interface ApprovalActionPayload {
    comments?: string;
}
