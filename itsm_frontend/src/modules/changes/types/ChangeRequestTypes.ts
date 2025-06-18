// itsm_frontend/src/modules/changes/types/ChangeRequestTypes.ts
import { ConfigurationItem } from '../../configs/types'; // Assuming CI types are here
// import { Incident } from '../../incidents/types'; // If incidents are linked

export type ChangeType = 'standard' | 'normal' | 'emergency';
export const ChangeTypeOptions: ChangeType[] = ['standard', 'normal', 'emergency'];

export type ChangeStatus =
    | 'draft' | 'pending_approval' | 'approved' | 'scheduled'
    | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'reviewed' | 'rejected'; // Added 'rejected'
export const ChangeStatusOptions: ChangeStatus[] = [
    'draft', 'pending_approval', 'approved', 'rejected', // Added 'rejected'
    'scheduled', 'in_progress', 'completed', 'failed', 'cancelled', 'reviewed'
];

export type ChangeImpact = 'low' | 'medium' | 'high';
export const ChangeImpactOptions: ChangeImpact[] = ['low', 'medium', 'high'];

export interface ChangeRequest {
  id: number;
  title: string;
  description: string;
  change_type: ChangeType;
  status: ChangeStatus;
  requested_by?: number | null; // User ID
  requested_by_username?: string | null;
  assigned_to?: number | null; // User ID
  assigned_to_username?: string | null;
  impact: ChangeImpact;
  justification?: string | null;
  planned_start_date: string; // ISO datetime string
  planned_end_date: string; // ISO datetime string
  affected_cis: number[]; // Array of CI IDs
  affected_cis_details?: ConfigurationItem[]; // For display
  // related_incidents?: number[]; // Array of Incident IDs
  // related_incidents_details?: Incident[]; // For display
  rollback_plan?: string | null;
  implementation_notes?: string | null;
  post_implementation_review?: string | null;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  completed_at?: string | null; // ISO datetime string
}

export interface NewChangeRequestData {
  title: string;
  description: string;
  change_type: ChangeType;
  status?: ChangeStatus; // Often starts as 'draft' or 'pending_approval' by default
  // requested_by might be set by backend
  assigned_to?: number | null;
  impact: ChangeImpact;
  justification?: string | null;
  planned_start_date: string;
  planned_end_date: string;
  affected_cis?: number[];
  // related_incidents?: number[];
  rollback_plan?: string | null;
}
