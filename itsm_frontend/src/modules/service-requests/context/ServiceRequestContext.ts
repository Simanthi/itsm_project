// itsm_frontend/src/modules/service-requests/context/ServiceRequestContext.ts

import { createContext } from 'react';
import { type ServiceRequest, type NewServiceRequestData } from '../types/ServiceRequestTypes';
import { type GridPaginationModel } from '@mui/x-data-grid'; // FIX: Import GridPaginationModel

interface ServiceRequestContextType {
  serviceRequests: ServiceRequest[];
  addServiceRequest: (newRequestData: NewServiceRequestData) => Promise<ServiceRequest>;
  updateServiceRequest: (updatedRequest: ServiceRequest) => Promise<ServiceRequest>;
  loading: boolean;
  error: string | null;
  fetchServiceRequests: () => Promise<void>;
  deleteServiceRequest: (requestId: string) => Promise<void>; // Add delete method to context
  totalCount: number; // FIX: New: Total number of items for server-side pagination
  paginationModel: GridPaginationModel; // FIX: New: Current page and page size
  setPaginationModel: React.Dispatch<React.SetStateAction<GridPaginationModel>>; // FIX: New: Setter for pagination model
}

export const ServiceRequestContext = createContext<ServiceRequestContextType | undefined>(undefined);
