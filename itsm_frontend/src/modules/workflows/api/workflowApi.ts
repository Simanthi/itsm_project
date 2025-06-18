import { apiClient } from '../../../api/apiClient';
import { type ApprovalRequest, type ApprovalStep, type ApprovalActionPayload } from '../types';

// Define a type for paginated or direct list responses
type ListResponse<T> = { data: T[] } | { data: { results: T[] } };

// Helper for list responses
const processListResponse = <T>(response: ListResponse<T>): T[] => {
    if ('data' in response && Array.isArray((response as { data: T[] }).data)) {
        return (response as { data: T[] }).data;
    }
    if (
        'data' in response &&
        (response as { data: { results: T[] } }).data &&
        Array.isArray((response as { data: { results: T[] } }).data.results)
    ) {
        return (response as { data: { results: T[] } }).data.results;
    }
    console.warn("Unexpected API response structure for list:", response);
    return [];
};

// Approval Requests
export const getApprovalRequests = async (filters?: Record<string, unknown>): Promise<ApprovalRequest[]> => {
    const params = filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : '';
    const response = await apiClient<ListResponse<ApprovalRequest>>(
        `/api/workflows/requests/${params}`,
        '',
        { method: 'GET' }
    );
    return processListResponse<ApprovalRequest>(response);
};

export const getApprovalRequestById = async (id: number): Promise<ApprovalRequest> => {
    const response = await apiClient<{ data: ApprovalRequest }>(
        `/api/workflows/requests/${id}/`,
        '',
        { method: 'GET' }
    );
    return response.data;
};

// Approval Steps
export const getMyApprovalSteps = async (status: string = 'pending'): Promise<ApprovalStep[]> => {
    const response = await apiClient<ListResponse<ApprovalStep>>(
        `/api/workflows/steps/?status=${encodeURIComponent(status)}`,
        '',
        { method: 'GET' }
    );
    return processListResponse<ApprovalStep>(response);
};

export const getApprovalStepsForRequest = async (requestId: number): Promise<ApprovalStep[]> => {
    const response = await apiClient<ListResponse<ApprovalStep>>(
        `/api/workflows/steps/?approval_request=${requestId}`,
        '',
        { method: 'GET' }
    );
    return processListResponse<ApprovalStep>(response);
};

export const approveStep = async (stepId: number, payload?: ApprovalActionPayload): Promise<ApprovalStep> => {
    const response = await apiClient<{ data: ApprovalStep }>(
        `/api/workflows/steps/${stepId}/approve/`,
        '',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload ?? {}),
        }
    );
    return response.data;
};

export const rejectStep = async (stepId: number, payload?: ApprovalActionPayload): Promise<ApprovalStep> => {
    const response = await apiClient<{ data: ApprovalStep }>(
        `/api/workflows/steps/${stepId}/reject/`,
        '',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload ?? {}),
        }
    );
    return response.data;
};
