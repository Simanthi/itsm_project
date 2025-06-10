// itsm_frontend/src/modules/service-requests/context/ServiceRequestProvider.tsx
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { type ServiceRequest, type NewServiceRequestData } from "../types/ServiceRequestTypes";
import { ServiceRequestContext } from "./ServiceRequestContext";
import { getServiceRequests, createServiceRequest as apiCreateServiceRequest, updateServiceRequest as apiUpdateServiceRequest } from '../../../api/serviceRequestApi';
import { useAuth } from '../../../context/auth/useAuth';

interface ServiceRequestProviderProps {
  children: ReactNode;
}

export const ServiceRequestProvider = ({ children }: ServiceRequestProviderProps) => {
  const { token, isAuthenticated } = useAuth();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceRequests = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      setError("Authentication required to fetch service requests.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getServiceRequests(token);
      console.log("ServiceRequestProvider: Fetched data from API:", data); // DEBUG LOG
      setServiceRequests(data);
    } catch (err) {
      console.error("ServiceRequestProvider: Error fetching service requests:", err); // DEBUG LOG
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    fetchServiceRequests();
  }, [fetchServiceRequests]);

  const addServiceRequest = async (newRequestData: NewServiceRequestData): Promise<ServiceRequest> => {
    if (!token) {
      const errorMessage = "Authentication token not found. Cannot add request.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
    try {
      const createdRequest = await apiCreateServiceRequest(newRequestData, token);
      console.log("ServiceRequestProvider: Created new request:", createdRequest); // DEBUG LOG
      setServiceRequests((prevRequests) => [...prevRequests, createdRequest]);
      return createdRequest;
    } catch (err) {
      console.error("ServiceRequestProvider: Error adding service request:", err); // DEBUG LOG
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateServiceRequest = async (updatedRequest: ServiceRequest): Promise<ServiceRequest> => {
    if (!token) {
      const errorMessage = "Authentication token not found. Cannot update request.";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
    try {
      const updatedResponse = await apiUpdateServiceRequest(Number(updatedRequest.id), updatedRequest, token);
      console.log("ServiceRequestProvider: Updated request:", updatedResponse); // DEBUG LOG
      setServiceRequests((prevRequests) =>
        prevRequests.map((request) =>
          Number(request.id) === Number(updatedRequest.id) ? updatedResponse : request
        )
      );
      return updatedResponse;
    } catch (err) {
      console.error("ServiceRequestProvider: Error updating service request:", err); // DEBUG LOG
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return (
    <ServiceRequestContext.Provider
      value={{ serviceRequests, addServiceRequest, updateServiceRequest, loading, error }}
    >
      {children}
    </ServiceRequestContext.Provider>
  );
};
