// itsm_frontend/src/features/serviceRequests/types/serviceRequestTypes.ts

export interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  requestedBy: string;
  requestedDate: string;
}

// Optionally, define the form data interface separately if it differs from the full ServiceRequest
export interface NewServiceRequestFormData {
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed' | '';
  requestedBy: string;
  requestedDate: string;
}