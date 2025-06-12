// itsm_frontend/src/modules/service-requests/context/ServiceRequestContext.ts
import { createContext } from 'react';
import { type ServiceRequest, type NewServiceRequestData } from '../types/ServiceRequestTypes';
import { type GridPaginationModel } from '@mui/x-data-grid'; // Import GridPaginationModel

interface ServiceRequestContextType {
  serviceRequests: ServiceRequest[];
  addServiceRequest: (newRequestData: NewServiceRequestData) => Promise<ServiceRequest>;
  updateServiceRequest: (updatedRequest: ServiceRequest) => Promise<ServiceRequest>;
  loading: boolean;
  error: string | null;
  fetchServiceRequests: () => Promise<void>;
  deleteServiceRequest: (requestId: string) => Promise<void>;
  totalCount: number;
  paginationModel: GridPaginationModel;
  setPaginationModel: React.Dispatch<React.SetStateAction<GridPaginationModel>>;
}

export const ServiceRequestContext = createContext<ServiceRequestContextType | undefined>(undefined);