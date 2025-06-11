// itsm_frontend/src/modules/service-requests/context/ServiceRequestProvider.tsx
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { type ServiceRequest, type NewServiceRequestData, type ServiceRequestStatus } from "../types/ServiceRequestTypes";
import { ServiceRequestContext } from "./ServiceRequestContext";
import {
  getServiceRequests,
  createServiceRequest as apiCreateServiceRequest,
  updateServiceRequest as apiUpdateServiceRequest,
  deleteServiceRequest as apiDeleteServiceRequest,
} from '../../../api/serviceRequestApi';
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
    console.log("ServiceRequestProvider: fetchServiceRequests called.");
    if (!isAuthenticated || !token) {
      setLoading(false);
      setError("Authentication required to fetch service requests.");
      console.log("ServiceRequestProvider: Skipping fetch due to no auth.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getServiceRequests(token);
      console.log("ServiceRequestProvider: Fetched data from API:", data);
      setServiceRequests(data);
      console.log("ServiceRequestProvider: State updated with fetched data. Current serviceRequests length:", data.length);
      data.forEach(req => console.log(`  Fetched Req ID: ${req.id}, Req_ID: ${req.request_id}, Status: ${req.status}, Priority: ${req.priority}, Assigned To: ${req.assigned_to_username}`));
    } catch (err) {
      console.error("ServiceRequestProvider: Error fetching service requests:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      console.log("ServiceRequestProvider: fetchServiceRequests finished.");
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    fetchServiceRequests();
  }, [fetchServiceRequests]);

  const addServiceRequest = useCallback(async (newRequestData: NewServiceRequestData): Promise<ServiceRequest> => {
    console.log("ServiceRequestProvider: addServiceRequest called with data:", newRequestData);
    if (!token) {
      const errorMessage = "Authentication token not found. Cannot add request.";
      setError(errorMessage);
      console.error("ServiceRequestProvider: " + errorMessage);
      throw new Error(errorMessage);
    }
    try {
      const createdRequest = await apiCreateServiceRequest(newRequestData, token);
      console.log("ServiceRequestProvider: API returned created request:", createdRequest);
      setServiceRequests((prevRequests) => {
        const updatedList = [...prevRequests, createdRequest];
        console.log("ServiceRequestProvider: addServiceRequest state update. New list length:", updatedList.length);
        updatedList.forEach(req => console.log(`  Added Req ID: ${req.id}, Req_ID: ${req.request_id}, Status: ${req.status}, Priority: ${req.priority}, Assigned To: ${req.assigned_to_username}`));
        return updatedList;
      });
      return createdRequest;
    } catch (err) {
      console.error("ServiceRequestProvider: Error adding service request:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [token]);

  const updateServiceRequest = useCallback(async (updatedRequest: ServiceRequest): Promise<ServiceRequest> => {
    console.log("ServiceRequestProvider: updateServiceRequest called with data:", updatedRequest);
    if (!token) {
      const errorMessage = "Authentication token not found. Cannot update request.";
      setError(errorMessage);
      console.error("ServiceRequestProvider: " + errorMessage);
      throw new Error(errorMessage);
    }
    if (!updatedRequest.request_id) {
      const errorMessage = "Service Request ID (request_id) is missing. Cannot update request.";
      setError(errorMessage);
      console.error("ServiceRequestProvider: " + errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const payloadToSend: Partial<NewServiceRequestData> & { status?: ServiceRequestStatus } = {
        title: updatedRequest.title,
        description: updatedRequest.description,
        category: updatedRequest.category,
        status: updatedRequest.status,
        priority: updatedRequest.priority,
        assigned_to_id: updatedRequest.assigned_to_id,
      };

      console.log("ServiceRequestProvider: Sending PATCH payload to API:", payloadToSend);

      const updatedResponse = await apiUpdateServiceRequest(updatedRequest.request_id, payloadToSend, token);
      console.log("ServiceRequestProvider: API returned updated request (from backend):", updatedResponse);

      setServiceRequests((prevRequests) => {
        const updatedList = prevRequests.map((request) => {
          const match = (request.id === updatedResponse.id);
          console.log(`  Comparing existing request (ID: ${request.id}) with updatedResponse (ID: ${updatedResponse.id}). Match: ${match}`);
          return match ? { ...updatedResponse } : { ...request };
        });
        console.log("ServiceRequestProvider: updateServiceRequest state update. New list length:", updatedList.length);
        updatedList.forEach(req => console.log(`  Updated Req ID: ${req.id}, Req_ID: ${req.request_id}, Status: ${req.status}, Priority: ${req.priority}, Assigned To: ${req.assigned_to_username}`));
        return updatedList;
      });
      return updatedResponse;
    } catch (err) {
      console.error("ServiceRequestProvider: Error updating service request:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [token]);

  const deleteServiceRequest = useCallback(async (requestId: string): Promise<void> => {
    console.log("ServiceRequestProvider: deleteServiceRequest called for ID:", requestId);
    if (!token) {
      const errorMessage = "Authentication token not found. Cannot delete request.";
      setError(errorMessage);
      console.error("ServiceRequestProvider: " + errorMessage);
      throw new Error(errorMessage);
    }
    try {
      await apiDeleteServiceRequest(requestId, token);
      console.log("ServiceRequestProvider: API returned success for deletion of ID:", requestId);
      setServiceRequests(prevRequests => prevRequests.filter(req => req.request_id !== requestId));
      console.log("ServiceRequestProvider: State updated after deletion. New list length:", serviceRequests.length -1); // Approx. length
    } catch (err) {
      console.error("ServiceRequestProvider: Error deleting service request:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [token, serviceRequests.length]); // Add serviceRequests.length dependency for filter consistency


  return (
    <ServiceRequestContext.Provider
      value={{ serviceRequests, addServiceRequest, updateServiceRequest, deleteServiceRequest, loading, error, fetchServiceRequests }}
    >
      {children}
    </ServiceRequestContext.Provider>
  );
};