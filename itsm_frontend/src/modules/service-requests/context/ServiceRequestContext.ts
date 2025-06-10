// itsm_frontend/src/modules/service-requests/context/ServiceRequestContext.ts
import { createContext } from 'react';
import { type ServiceRequest, type NewServiceRequestData } from '../types/ServiceRequestTypes';

interface ServiceRequestContextType {
  serviceRequests: ServiceRequest[];
  addServiceRequest: (newRequestData: NewServiceRequestData) => Promise<ServiceRequest>; // Add Promise return type
  updateServiceRequest: (updatedRequest: ServiceRequest) => Promise<ServiceRequest>; // Add Promise return type
  loading: boolean; // Added loading state
  error: string | null; // Added error state
}

export const ServiceRequestContext = createContext<ServiceRequestContextType | undefined>(undefined);