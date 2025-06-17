// itsm_frontend/src/modules/service-requests/context/ServiceRequestProvider.tsx
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type ServiceRequest,
  type NewServiceRequestData,
  type ServiceRequestStatus,
} from '../types/ServiceRequestTypes';
import { ServiceRequestContext } from './ServiceRequestContext';
import {
  getServiceRequests,
  createServiceRequest as apiCreateServiceRequest,
  updateServiceRequest as apiUpdateServiceRequest,
  deleteServiceRequest as apiDeleteServiceRequest,
} from '../../../api/serviceRequestApi';
import { useAuth } from '../../../context/auth/useAuth';
import { type GridPaginationModel } from '@mui/x-data-grid'; // Import GridPaginationModel

interface ServiceRequestProviderProps {
  children: ReactNode;
}

export const ServiceRequestProvider = ({
  children,
}: ServiceRequestProviderProps) => {
  const { isAuthenticated, authenticatedFetch } = useAuth(); // Removed token
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  // Add totalCount and paginationModel states
  const [totalCount, setTotalCount] = useState<number>(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0, // DataGrid uses 0-indexed page
    pageSize: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceRequests = useCallback(async () => {
    console.log(
      'ServiceRequestProvider: fetchServiceRequests called with pagination:',
      paginationModel,
    );
    if (!isAuthenticated || !authenticatedFetch) {
      // Check for authenticatedFetch
      setLoading(false);
      setError('Authentication required to fetch service requests.');
      console.log(
        'ServiceRequestProvider: Skipping fetch due to no auth or missing authenticatedFetch.',
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Call API with current pagination model (+1 for 1-indexed backend)
      // Correctly destructure results and count from the getServiceRequests response
      const { results, count } = await getServiceRequests(
        authenticatedFetch, // Pass authenticatedFetch
        paginationModel.page + 1,
        paginationModel.pageSize,
      );
      console.log(
        'ServiceRequestProvider: Fetched data from API. Results count:',
        results.length,
        'Total Count:',
        count,
      );
      setServiceRequests(results);
      setTotalCount(count); // Set total count from API response
      console.log('ServiceRequestProvider: State updated with fetched data.');
      // Explicitly type 'req' in forEach loop
      results.forEach((req: ServiceRequest) =>
        console.log(
          `  Fetched Req ID: ${req.id}, Req_ID: ${req.request_id}, Status: ${req.status}, Priority: ${req.priority}, Assigned To: ${req.assigned_to_username}`,
        ),
      );
    } catch (err) {
      console.error(
        'ServiceRequestProvider: Error fetching service requests:',
        err,
      );
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      console.log('ServiceRequestProvider: fetchServiceRequests finished.');
    }
    // FIX: Changed dependency array to include paginationModel directly, as ESLint suggests.
    // This satisfies the exhaustive-deps rule, as the entire object is used in the callback.
  }, [isAuthenticated, authenticatedFetch, paginationModel]); // Added authenticatedFetch to dependencies

  useEffect(() => {
    fetchServiceRequests();
  }, [fetchServiceRequests]);

  const addServiceRequest = useCallback(
    async (newRequestData: NewServiceRequestData): Promise<ServiceRequest> => {
      console.log(
        'ServiceRequestProvider: addServiceRequest called with data:',
        newRequestData,
      );
      if (!authenticatedFetch) {
        // Check for authenticatedFetch
        const errorMessage =
          'Authentication context not available. Cannot add request.';
        setError(errorMessage);
        console.error('ServiceRequestProvider: ' + errorMessage);
        throw new Error(errorMessage);
      }
      try {
        const createdRequest = await apiCreateServiceRequest(
          authenticatedFetch, // Pass authenticatedFetch
          newRequestData,
        );
        console.log(
          'ServiceRequestProvider: API returned created request:',
          createdRequest,
        );
        // After adding, re-fetch the current page to reflect changes, or update state intelligently if on first page
        await fetchServiceRequests();
        return createdRequest;
      } catch (err) {
        console.error(
          'ServiceRequestProvider: Error adding service request:',
          err,
        );
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [authenticatedFetch, fetchServiceRequests], // Added authenticatedFetch
  );

  const updateServiceRequest = useCallback(
    async (updatedRequest: ServiceRequest): Promise<ServiceRequest> => {
      console.log(
        'ServiceRequestProvider: updateServiceRequest called with data:',
        updatedRequest,
      );
      if (!authenticatedFetch) {
        // Check for authenticatedFetch
        const errorMessage =
          'Authentication context not available. Cannot update request.';
        setError(errorMessage);
        console.error('ServiceRequestProvider: ' + errorMessage);
        throw new Error(errorMessage);
      }
      if (!updatedRequest.request_id) {
        const errorMessage =
          'Service Request ID (request_id) is missing. Cannot update request.';
        setError(errorMessage);
        console.error('ServiceRequestProvider: ' + errorMessage);
        throw new Error(errorMessage);
      }
      try {
        const payloadToSend: Partial<NewServiceRequestData> & {
          status?: ServiceRequestStatus;
        } = {
          title: updatedRequest.title,
          description: updatedRequest.description,
          category: updatedRequest.category,
          status: updatedRequest.status,
          priority: updatedRequest.priority,
          requested_by_id: updatedRequest.requested_by_id,
          assigned_to_id: updatedRequest.assigned_to_id,
        };
        console.log(
          'ServiceRequestProvider: Sending PATCH payload to API:',
          payloadToSend,
        );
        // Pass request_id for the update API call
        const updatedResponse = await apiUpdateServiceRequest(
          authenticatedFetch, // Pass authenticatedFetch
          updatedRequest.request_id,
          payloadToSend,
        );
        console.log(
          'ServiceRequestProvider: API returned updated request (from backend):',
          updatedResponse,
        );
        // After updating, re-fetch the current page
        await fetchServiceRequests();
        return updatedResponse;
      } catch (err) {
        console.error(
          'ServiceRequestProvider: Error updating service request:',
          err,
        );
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [authenticatedFetch, fetchServiceRequests], // Added authenticatedFetch
  );

  const deleteServiceRequest = useCallback(
    async (requestId: string): Promise<void> => {
      console.log(
        'ServiceRequestProvider: deleteServiceRequest called for ID:',
        requestId,
      );
      if (!authenticatedFetch) {
        // Check for authenticatedFetch
        const errorMessage =
          'Authentication context not available. Cannot delete request.';
        setError(errorMessage);
        console.error('ServiceRequestProvider: ' + errorMessage);
        throw new Error(errorMessage);
      }
      try {
        await apiDeleteServiceRequest(authenticatedFetch, requestId); // Pass authenticatedFetch
        console.log(
          'ServiceRequestProvider: API returned success for deletion of ID:',
          requestId,
        );
        // After deleting, re-fetch the current page
        await fetchServiceRequests();
      } catch (err) {
        console.error(
          'ServiceRequestProvider: Error deleting service request:',
          err,
        );
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [authenticatedFetch, fetchServiceRequests], // Added authenticatedFetch
  );

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
