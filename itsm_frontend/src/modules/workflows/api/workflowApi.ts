import apiClient from '../../../api/apiClient'; // Adjust path as necessary
import { ApprovalRequest, ApprovalStep, ApprovalActionPayload } from '../types';

const processListResponse = <T>(response: any): T[] => {
    // Check if response.data itself is the array (direct list)
    if (Array.isArray(response.data)) {
        return response.data as T[];
    }
    // Check for DRF's default paginated structure
    if (response.data && Array.isArray(response.data.results)) {
        return response.data.results;
    }
    console.warn("Unexpected API response structure for list:", response);
    return [];
};

// Approval Requests
export const getApprovalRequests = async (filters?: Record<string, any>): Promise<ApprovalRequest[]> => {
    const response = await apiClient.get('/api/workflows/requests/', { params: filters });
    return processListResponse<ApprovalRequest>(response);
};

export const getApprovalRequestById = async (id: number): Promise<ApprovalRequest> => {
    const response = await apiClient.get<ApprovalRequest>(`/api/workflows/requests/${id}/`);
    return response.data;
};

// Approval Steps
export const getMyApprovalSteps = async (status: string = 'pending'): Promise<ApprovalStep[]> => {
    // The backend ViewSet is already filtered by user for non-staff.
    // We can still pass status if the backend supports filtering by it for the current user.
    const response = await apiClient.get('/api/workflows/steps/', { params: { status } });
    return processListResponse<ApprovalStep>(response);
};

export const getApprovalStepsForRequest = async (requestId: number): Promise<ApprovalStep[]> => {
    const response = await apiClient.get('/api/workflows/steps/', { params: { approval_request: requestId } });
    return processListResponse<ApprovalStep>(response);
};

export const approveStep = async (stepId: number, payload?: ApprovalActionPayload): Promise<ApprovalStep> => {
    const response = await apiClient.post<ApprovalStep>(`/api/workflows/steps/${stepId}/approve/`, payload);
    return response.data;
};

export const rejectStep = async (stepId: number, payload?: ApprovalActionPayload): Promise<ApprovalStep> => {
    const response = await apiClient.post<ApprovalStep>(`/api/workflows/steps/${stepId}/reject/`, payload);
    return response.data;
};
