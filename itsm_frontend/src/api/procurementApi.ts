// itsm_frontend/src/api/procurementApi.ts

// 1. Type alias for authenticatedFetch
export type AuthenticatedFetch = (
  endpoint: string,
  options?: RequestInit,
) => Promise<any>;

// 2. TypeScript Types/Interfaces

export type PurchaseRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'po_created'
  | 'cancelled';

export interface UserSummary {
  id: number;
  username: string;
  // Add other relevant user fields if needed, e.g., first_name, last_name
}

export interface PurchaseRequestMemo {
  id: number;
  item_description: string;
  quantity: number;
  reason: string;
  estimated_cost?: number | null;
  requested_by: number; // ID of the user
  requested_by_username: string; // Username for display
  request_date: string; // ISO date string
  status: PurchaseRequestStatus;
  approver?: number | null; // ID of the user
  approver_username?: string | null; // Username for display, can be null
  decision_date?: string | null; // ISO date string
  approver_comments?: string | null;
}

export interface PurchaseRequestMemoData { // For POST (creation)
  item_description: string;
  quantity: number;
  reason: string;
  estimated_cost?: number | null;
  // requested_by is automatically set by the backend using request.user
}

export interface PurchaseRequestMemoUpdateData { // For PATCH/PUT (updates)
  item_description?: string;
  quantity?: number;
  reason?: string;
  estimated_cost?: number | null;
  // Other fields like status, approver, etc., are typically updated via specific actions
  // or by users with special permissions not covered by general update.
}


export interface PurchaseRequestDecisionData {
  decision: 'approved' | 'rejected'; // Matches choices in backend
  comments?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- API Function Parameters ---
export interface GetPurchaseRequestMemosParams {
  page?: number;
  pageSize?: number;
  ordering?: string; // e.g., "request_date", "-status"
  // Add other filter params as needed, e.g., status, requested_by_id
  status?: PurchaseRequestStatus;
  requested_by_id?: number;
  [key: string]: any; // For other potential filters
}


// 3. API Base Path
const API_PROCUREMENT_PATH = '/procurement'; // Relative to global API_BASE_URL (e.g., /api)

// 4. API Client Functions

/**
 * Fetches a paginated list of purchase request memos.
 */
export const getPurchaseRequestMemos = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetPurchaseRequestMemosParams,
): Promise<PaginatedResponse<PurchaseRequestMemo>> => {
  const queryParams = new URLSearchParams();
  if (params) {
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('page_size', params.pageSize.toString());
    if (params.ordering) queryParams.append('ordering', params.ordering);
    if (params.status) queryParams.append('status', params.status);
    if (params.requested_by_id) queryParams.append('requested_by', params.requested_by_id.toString());
    // Add other specific filters here if they are common
    // For truly dynamic filters, ensure backend supports them via a filterset_class
  }
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

/**
 * Creates a new purchase request memo.
 */
export const createPurchaseRequestMemo = async (
  authenticatedFetch: AuthenticatedFetch,
  data: PurchaseRequestMemoData,
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/`;
  return await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

/**
 * Fetches a single purchase request memo by its ID.
 */
export const getPurchaseRequestMemoById = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

/**
 * Updates an existing purchase request memo (partially using PATCH).
 * Note: Backend permissions will determine what can be updated and by whom.
 * Typically, requesters can only update their own pending requests.
 */
export const updatePurchaseRequestMemo = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  data: Partial<PurchaseRequestMemoUpdateData>, // Use a specific update type
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/`;
  return await authenticatedFetch(endpoint, {
    method: 'PATCH', // Using PATCH for partial updates
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

/**
 * Submits a decision (approve/reject) for a purchase request memo.
 */
export const decidePurchaseRequestMemo = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  decisionData: PurchaseRequestDecisionData,
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/decide/`;
  return await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decisionData),
  });
};

/**
 * Cancels a purchase request memo.
 * Typically can only be done by the requester if the memo is still 'pending'.
 */
export const cancelPurchaseRequestMemo = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<PurchaseRequestMemo> => { // Assuming backend returns the updated memo
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/cancel/`;
  return await authenticatedFetch(endpoint, {
    method: 'POST', // No body needed, action is identified by URL
    headers: { 'Content-Type': 'application/json' }, // Still good practice
  });
};

// Note: Delete functionality for PurchaseRequestMemo might be restricted or not commonly used
// once a request is in a workflow. If needed, it would be:
/*
export const deletePurchaseRequestMemo = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<void> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/`;
  await authenticatedFetch(endpoint, { method: 'DELETE' });
};
*/
