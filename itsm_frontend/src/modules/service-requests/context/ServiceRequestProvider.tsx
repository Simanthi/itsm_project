// itsm_frontend/src/modules/service-requests/context/ServiceRequestProvider.tsx

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { type ServiceRequest, type NewServiceRequestData, type ServiceRequestStatus } from "../types/ServiceRequestTypes";
import { ServiceRequestContext } from "./ServiceRequestContext";
import {
  getServiceRequests,
  createServiceRequest as apiCreateServiceRequest,
  updateServiceRequest as apiUpdateServiceRequest,
  deleteServiceRequest as apiDeleteServiceRequest, // Import delete API
} from '../../../api/serviceRequestApi';
import { useAuth } from '../../../context/auth/useAuth';
import { type GridPaginationModel } from '@mui/x-data-grid'; // Import GridPaginationModel

interface ServiceRequestProviderProps {
  children: ReactNode;
}

export const ServiceRequestProvider = ({ children }: ServiceRequestProviderProps) => {
  const { token, isAuthenticated } = useAuth();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0); // FIX: New state for total count
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ // FIX: New state for pagination model
    page: 0, // DataGrid uses 0-indexed page
    pageSize: 10,
  });
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
      // FIX: Call API with current pagination model (+1 for 1-indexed backend page)
      const { results, count } = await getServiceRequests(token, paginationModel.page + 1, paginationModel.pageSize);
      console.log("ServiceRequestProvider: Fetched data from API:", results);
      setServiceRequests(results);
      setTotalCount(count); // FIX: Set total count from API response
      console.log("ServiceRequestProvider: State updated with fetched data. Current serviceRequests length:", results.length);
      results.forEach(req => console.log(`  Fetched Req ID: ${req.id}, Req_ID: ${req.request_id}, Status: ${req.status}, Priority: ${req.priority}, Assigned To: ${req.assigned_to_username}`));
    } catch (err) {
      console.error("ServiceRequestProvider: Error fetching service requests:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      console.log("ServiceRequestProvider: fetchServiceRequests finished.");
    }
  }, [isAuthenticated, token, paginationModel.page, paginationModel.pageSize]); // FIX: Add paginationModel to dependencies

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
      // FIX: After adding, re-fetch the current page to reflect changes
      await fetchServiceRequests();
      return createdRequest;
    } catch (err) {
      console.error("ServiceRequestProvider: Error adding service request:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [token, fetchServiceRequests]); // FIX: Add fetchServiceRequests to dependencies

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
      // FIX: After updating, re-fetch the current page to reflect changes
      await fetchServiceRequests();
      return updatedResponse;
    } catch (err) {
      console.error("ServiceRequestProvider: Error updating service request:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [token, fetchServiceRequests]); // FIX: Add fetchServiceRequests to dependencies

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
      // FIX: After deleting, re-fetch the current page to reflect changes
      await fetchServiceRequests();
    } catch (err) {
      console.error("ServiceRequestProvider: Error deleting service request:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [token, fetchServiceRequests]); // FIX: Add fetchServiceRequests to dependencies

  return (
    <ServiceRequestContext.Provider
      value={{
        serviceRequests,
        addServiceRequest,
        updateServiceRequest,
        deleteServiceRequest, // Provide delete method
        loading,
        error,
        fetchServiceRequests,
        totalCount, // Provide total count
        paginationModel, // Provide pagination model
        setPaginationModel, // Provide setter for pagination model
      }}
    >
      {children}
    </ServiceRequestContext.Provider>
  );
};
