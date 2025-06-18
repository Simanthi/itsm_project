// import { apiClient } from '../../../api/apiClient'; // No longer directly used
import { type ApprovalRequest, type ApprovalStep, type ApprovalActionPayload } from '../types';
import type { AuthenticatedFetch } from '../../../context/auth/AuthContextDefinition'; // Import AuthenticatedFetch

// Define a type for paginated or direct list responses
// Assuming authenticatedFetch returns the direct data structure (e.g., results array or single object)
type DirectListResponse<T> = { results: T[] } | T[];


// Helper for list responses
const processListResponse = <T>(response: DirectListResponse<T>): T[] => {
    if (response && Array.isArray((response as { results: T[] }).results)) {
        return (response as { results: T[] }).results;
    }
    // If it's already an array (no 'results' wrapper)
    if (Array.isArray(response)) {
        return response;
    }
    console.warn("Unexpected API response structure for list:", response);
    return [];
};

// Approval Requests
export const getApprovalRequests = async (authenticatedFetch: AuthenticatedFetch, filters?: Record<string, unknown>): Promise<ApprovalRequest[]> => {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : '';
    const response = await authenticatedFetch<DirectListResponse<ApprovalRequest>>(
        `/workflows/requests/${params}`,
        { method: 'GET' }
    );
    return processListResponse<ApprovalRequest>(response);
};

export const getApprovalRequestById = async (authenticatedFetch: AuthenticatedFetch, id: number): Promise<ApprovalRequest> => {
    const response = await authenticatedFetch<ApprovalRequest>(
        `/workflows/requests/${id}/`,
        { method: 'GET' }
    );
    return response; // Assuming direct data return
};

// Approval Steps
export const getMyApprovalSteps = async (authenticatedFetch: AuthenticatedFetch, status: string = 'pending'): Promise<ApprovalStep[]> => {
    const response = await authenticatedFetch<DirectListResponse<ApprovalStep>>(
        `/workflows/steps/?status=${encodeURIComponent(status)}`,
        { method: 'GET' }
    );
    return processListResponse<ApprovalStep>(response);
};

export const getApprovalStepsForRequest = async (authenticatedFetch: AuthenticatedFetch, requestId: number): Promise<ApprovalStep[]> => {
    const response = await authenticatedFetch<DirectListResponse<ApprovalStep>>(
        `/workflows/steps/?approval_request=${requestId}`,
        { method: 'GET' }
    );
    return processListResponse<ApprovalStep>(response);
};

export const approveStep = async (authenticatedFetch: AuthenticatedFetch, stepId: number, payload?: ApprovalActionPayload): Promise<ApprovalStep> => {
    const response = await authenticatedFetch<ApprovalStep>(
        `/workflows/steps/${stepId}/approve/`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload ?? {}),
        }
    );
    return response; // Assuming direct data return
};

export const rejectStep = async (authenticatedFetch: AuthenticatedFetch, stepId: number, payload?: ApprovalActionPayload): Promise<ApprovalStep> => {
    const response = await authenticatedFetch<ApprovalStep>(
        `/workflows/steps/${stepId}/reject/`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload ?? {}),
        }
    );
    return response; // Assuming direct data return
};
