// itsm_frontend/src/features/serviceRequests/hooks/useServiceRequests.ts

import { useContext } from 'react';
import { ServiceRequestContext } from '../context/ServiceRequestContext'; // Import the context itself

// Custom hook to consume the ServiceRequestContext
export const useServiceRequests = () => {
  const context = useContext(ServiceRequestContext);
  if (context === undefined) {
    throw new Error(
      'useServiceRequests must be used within a ServiceRequestProvider',
    );
  }
  return context;
};
