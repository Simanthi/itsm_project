// itsm_frontend/src/features/serviceRequests/context/ServiceRequestContext.ts

import { createContext } from 'react';
import { type ServiceRequest, type NewServiceRequestFormData } from '../types/ServiceRequestTypes';

interface ServiceRequestContextType {
  serviceRequests: ServiceRequest[];
  addServiceRequest: (newRequestData: NewServiceRequestFormData) => void;
   updateServiceRequest: (updatedRequest: ServiceRequest) => void;
  // Potentially add updateServiceRequest, deleteServiceRequest, etc. here in the future
}

// Export the context itself
export const ServiceRequestContext = createContext<ServiceRequestContextType | undefined>(undefined);