// itsm_frontend/src/modules/service-requests/context/ServiceRequestContext.ts
import { createContext } from 'react';
import { type ServiceRequest, type NewServiceRequestData } from '../types/ServiceRequestTypes';

interface ServiceRequestContextType {
  serviceRequests: ServiceRequest[];
  addServiceRequest: (newRequestData: NewServiceRequestData) => Promise<ServiceRequest>;
  updateServiceRequest: (updatedRequest: ServiceRequest) => Promise<ServiceRequest>;
  loading: boolean;
  error: string | null;
  fetchServiceRequests: () => Promise<void>;
  // FIX: Ensure deleteServiceRequest is present and correctly typed here
  deleteServiceRequest: (requestId: string) => Promise<void>; 
}

export const ServiceRequestContext = createContext<ServiceRequestContextType | undefined>(undefined);