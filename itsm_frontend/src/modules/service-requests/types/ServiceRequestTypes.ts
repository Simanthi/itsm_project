// src/modules/service-requests/types/ServiceRequestTypes.ts

// Define specific literal types for dropdowns to ensure type safety
export type ServiceRequestStatus = 'new' | 'in_progress' | 'pending_approval' | 'resolved' | 'closed' | 'cancelled';
export type ServiceRequestCategory = 'software' | 'hardware' | 'account' | 'network' | 'information' | 'other';
// Ensure 'high' is the highest priority if 'critical' is not used in your backend
export type ServiceRequestPriority = 'low' | 'medium' | 'high';

// Type for the data submitted from the form (new requests and updates)
// This should include all fields that the user can directly input/select/modify
export type NewServiceRequestFormData = {
  title: string;
  description: string;
  status: ServiceRequestStatus;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
  assigned_to: string | null; // Added: Can be string (user ID/name) or null
  resolution_notes: string | null; // Added: Can be string or null
};

// Full Service Request type as it might come from the backend API
// This includes all fields, including those auto-generated or managed by the system
export type ServiceRequest = {
  id: string; // Unique ID, e.g., UUID from Django
  request_id: string; // Human-readable ID (e.g., SR-001), typically auto-generated
  title: string;
  description: string;
  status: ServiceRequestStatus;
  category: ServiceRequestCategory;
  priority: ServiceRequestPriority;
  requested_by: string | null; // User ID/name of the requester
  created_at: string; // ISO 8601 string date
  updated_at: string; // ISO 8601 string date
  resolved_at: string | null; // ISO 8601 string date, can be null
  assigned_to: string | null; // User ID/name of the assigned agent, can be null
  resolution_notes: string | null; // Notes about resolution, can be null
};