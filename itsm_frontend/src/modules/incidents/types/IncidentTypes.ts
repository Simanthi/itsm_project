// itsm_frontend/src/modules/incidents/types/IncidentTypes.ts
export type ImpactLevel = 'low' | 'medium' | 'high';
export type UrgencyLevel = 'low' | 'medium' | 'high';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'new' | 'in_progress' | 'on_hold' | 'resolved' | 'closed' | 'cancelled';

export interface Incident {
  id: number; // Assuming numeric ID from backend
  title: string;
  description: string;
  reported_by_username?: string; // Or a User object
  assigned_to_username?: string; // Or a User object
  status: IncidentStatus;

  impact: ImpactLevel;
  urgency: UrgencyLevel;
  priority: PriorityLevel; // The old priority field
  calculated_priority: PriorityLevel; // The new server-calculated priority

  related_asset_details?: { id: number; name: string; asset_tag: string }; // Example
  related_ci_details?: { id: number; name: string }; // Example

  resolution_notes?: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  resolved_at?: string | null; // ISO date string
  closed_at?: string | null; // ISO date string

  sla_response_target_at?: string | null; // ISO date string
  sla_resolve_target_at?: string | null;  // ISO date string

  // Add any other relevant fields based on your Incident model
  // e.g., reported_by_id, assigned_to_id if needed directly
}

export interface NewIncidentData {
  title: string;
  description: string;
  reported_by_id?: number | null; // Or however it's handled
  assigned_to_id?: number | null;
  status: IncidentStatus;
  impact: ImpactLevel;
  urgency: UrgencyLevel;
  // priority should likely not be sent if calculated_priority is used, or backend ignores it
  // related_asset_id?: number | null;
  // related_ci_id?: number | null;
}
