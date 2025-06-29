// itsm_frontend/src/api/procurementApi.ts

import type {
  AuthenticatedFetch,
  // UserSummary, // Not directly used in this file's functions but kept for context if needed later
  PurchaseRequestMemo,
  // PurchaseRequestMemoData, // No longer used directly as functions take FormData
  // PurchaseRequestMemoUpdateData, // No longer used directly as functions take FormData
  PurchaseRequestDecisionData,
  PaginatedResponse,
  GetPurchaseRequestMemosParams,
  // OrderItemData, // Not directly used in this file's functions
  // OrderItem, // Not directly used in this file's functions
  // VendorSummary, // Not directly used in this file's functions
  PurchaseOrder,
  // PurchaseOrderData, // No longer used directly as functions take FormData
  GetPurchaseOrdersParams,
  CheckRequest,
  // CheckRequestData, // No longer used directly as functions take FormData
  // CheckRequestUpdateData, // No longer used directly as functions take FormData
  AccountsDecisionPayload,
  ConfirmPaymentPayload,
  GetCheckRequestsParams,
  // Types for dropdown data - to be added in procurementTypes.ts
  Department,
  Project,
  ContractForDropdown,
  GLAccount,
  ExpenseCategory,
  RecurringPaymentForDropdown,
  // Vendor is typically handled by assetApi, but if a specific dropdown type is needed:
  // VendorForDropdown
} from '../modules/procurement/types/procurementTypes';


// API Base Path
const API_PROCUREMENT_PATH = '/procurement';

// --- API Functions for Dropdown Data ---

export const getDepartmentsForDropdown = async (
  authenticatedFetch: AuthenticatedFetch,
): Promise<PaginatedResponse<Department>> => {
  const endpoint = `${API_PROCUREMENT_PATH}/departments/?page_size=200`; // Fetch many for dropdown
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedResponse<Department>;
};

export const getProjectsForDropdown = async (
  authenticatedFetch: AuthenticatedFetch,
): Promise<PaginatedResponse<Project>> => {
  const endpoint = `${API_PROCUREMENT_PATH}/projects/?page_size=200`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedResponse<Project>;
};

// Note: getVendors is typically sourced from assetApi.ts.
// If a specific simple list is needed from procurement, an endpoint could be added.

export const getContractsForDropdown = async (
  authenticatedFetch: AuthenticatedFetch,
): Promise<PaginatedResponse<ContractForDropdown>> => {
  const endpoint = `${API_PROCUREMENT_PATH}/contracts/?page_size=200`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedResponse<ContractForDropdown>;
};

export const getGLAccountsForDropdown = async (
  authenticatedFetch: AuthenticatedFetch,
): Promise<PaginatedResponse<GLAccount>> => {
  const endpoint = `${API_PROCUREMENT_PATH}/gl-accounts/?page_size=200`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedResponse<GLAccount>;
};

export const getExpenseCategoriesForDropdown = async (
  authenticatedFetch: AuthenticatedFetch,
): Promise<PaginatedResponse<ExpenseCategory>> => {
  const endpoint = `${API_PROCUREMENT_PATH}/expense-categories/?page_size=200`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedResponse<ExpenseCategory>;
};

export const getRecurringPaymentsForDropdown = async (
  authenticatedFetch: AuthenticatedFetch,
): Promise<PaginatedResponse<RecurringPaymentForDropdown>> => {
  const endpoint = `${API_PROCUREMENT_PATH}/recurring-payments/?page_size=200`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedResponse<RecurringPaymentForDropdown>;
};


// 4. API Client Functions (Memo - existing)
// ... (existing memo functions remain unchanged) ...
export const getPurchaseRequestMemos = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetPurchaseRequestMemosParams,
): Promise<PaginatedResponse<PurchaseRequestMemo>> => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'pageSize') {
          // DRF uses 'page_size'
          queryParams.append('page_size', String(value));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });
  }
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as PaginatedResponse<PurchaseRequestMemo>;
};

export const createPurchaseRequestMemo = async (
  authenticatedFetch: AuthenticatedFetch,
  data: FormData, // Changed from PurchaseRequestMemoData
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    // headers: { 'Content-Type': 'application/json' }, // Remove for FormData
    body: data, // Pass FormData directly
  })) as PurchaseRequestMemo;
};

export const getPurchaseRequestMemoById = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as PurchaseRequestMemo;
};

export const updatePurchaseRequestMemo = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  data: FormData, // Changed from Partial<PurchaseRequestMemoUpdateData>
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'PATCH', // Or PUT, depending on backend. PATCH is typical for FormData updates if partial.
    // headers: { 'Content-Type': 'application/json' }, // Remove for FormData
    body: data, // Pass FormData directly
  })) as PurchaseRequestMemo;
};

export const decidePurchaseRequestMemo = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  decisionData: PurchaseRequestDecisionData,
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/decide/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decisionData),
  })) as PurchaseRequestMemo;
};

export const cancelPurchaseRequestMemo = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/cancel/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })) as PurchaseRequestMemo;
};

// --- Purchase Order Functions ---
// ... (existing PO functions remain unchanged) ...
export const getPurchaseOrders = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetPurchaseOrdersParams,
): Promise<PaginatedResponse<PurchaseOrder>> => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'pageSize') {
          queryParams.append('page_size', String(value));
        } else if (key === 'vendor_id') {
          // Example of specific param name mapping
          queryParams.append('vendor', String(value));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });
  }
  const endpoint = `${API_PROCUREMENT_PATH}/purchase-orders/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as PaginatedResponse<PurchaseOrder>;
};

export const createPurchaseOrder = async (
  authenticatedFetch: AuthenticatedFetch,
  data: FormData, // Changed from PurchaseOrderData
): Promise<PurchaseOrder> => {
  const endpoint = `${API_PROCUREMENT_PATH}/purchase-orders/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    // headers: { 'Content-Type': 'application/json' }, // Remove for FormData
    body: data, // Pass FormData directly
  })) as PurchaseOrder;
};

export const getPurchaseOrderById = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<PurchaseOrder> => {
  const endpoint = `${API_PROCUREMENT_PATH}/purchase-orders/${id}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as PurchaseOrder;
};

export const updatePurchaseOrder = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  data: FormData, // Changed from Partial<PurchaseOrderData>
): Promise<PurchaseOrder> => {
  const endpoint = `${API_PROCUREMENT_PATH}/purchase-orders/${id}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'PATCH', // Or PUT
    // headers: { 'Content-Type': 'application/json' }, // Remove for FormData
    body: data, // Pass FormData directly
  })) as PurchaseOrder;
};

export const deletePurchaseOrder = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<void> => {
  const endpoint = `${API_PROCUREMENT_PATH}/purchase-orders/${id}/`;
  await authenticatedFetch(endpoint, { method: 'DELETE' });
};

// --- Check Request Functions ---

export const getCheckRequests = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetCheckRequestsParams,
): Promise<PaginatedResponse<CheckRequest>> => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'pageSize') {
          queryParams.append('page_size', String(value));
        } else if (key === 'purchase_order_id') {
          queryParams.append('purchase_order', String(value));
        } else if (key === 'requested_by_id') {
          queryParams.append('requested_by', String(value));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });
  }
  const endpoint = `${API_PROCUREMENT_PATH}/check-requests/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as PaginatedResponse<CheckRequest>;
};

export const createCheckRequest = async (
  authenticatedFetch: AuthenticatedFetch,
  data: FormData, // Changed from CheckRequestData
): Promise<CheckRequest> => {
  const endpoint = `${API_PROCUREMENT_PATH}/check-requests/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    // headers: { 'Content-Type': 'application/json' }, // Remove for FormData
    body: data, // Pass FormData directly
  })) as CheckRequest;
};

export const getCheckRequestById = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<CheckRequest> => {
  const endpoint = `${API_PROCUREMENT_PATH}/check-requests/${id}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'GET',
  })) as CheckRequest;
};

export const updateCheckRequest = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  data: FormData, // Changed from Partial<CheckRequestUpdateData>
): Promise<CheckRequest> => {
  const endpoint = `${API_PROCUREMENT_PATH}/check-requests/${id}/`;
  return (await authenticatedFetch(endpoint, {
    method: 'PATCH', // Or PUT
    // headers: { 'Content-Type': 'application/json' }, // Remove for FormData
    body: data, // Pass FormData directly
  })) as CheckRequest;
};

export const submitCheckRequestForApproval = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<CheckRequest> => {
  const endpoint = `${API_PROCUREMENT_PATH}/check-requests/${id}/submit_for_approval/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })) as CheckRequest;
};

export const approveCheckRequestByAccounts = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  payload: AccountsDecisionPayload,
): Promise<CheckRequest> => {
  const endpoint = `${API_PROCUREMENT_PATH}/check-requests/${id}/accounts_approve/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })) as CheckRequest;
};

export const rejectCheckRequestByAccounts = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  payload: AccountsDecisionPayload, // Requires comments
): Promise<CheckRequest> => {
  const endpoint = `${API_PROCUREMENT_PATH}/check-requests/${id}/accounts_reject/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })) as CheckRequest;
};

export const markCheckRequestPaymentProcessing = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<CheckRequest> => {
  const endpoint = `${API_PROCUREMENT_PATH}/check-requests/${id}/mark_payment_processing/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })) as CheckRequest;
};

export const confirmCheckRequestPayment = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  payload: ConfirmPaymentPayload,
): Promise<CheckRequest> => {
  const endpoint = `${API_PROCUREMENT_PATH}/check-requests/${id}/confirm_payment/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })) as CheckRequest;
};

export const cancelCheckRequest = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<CheckRequest> => {
  const endpoint = `${API_PROCUREMENT_PATH}/check-requests/${id}/cancel/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })) as CheckRequest;
};

// --- (Optional) OrderItem Functions ---
// ... (existing commented out OrderItem functions remain unchanged) ...

// --- Approval Step API Functions ---

export const getApprovalSteps = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetApprovalStepsParams
): Promise<PaginatedResponse<ApprovalStep>> => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Map frontend param names to backend if they differ, e.g. content_type_app_label to content_type__app_label
        if (key === 'pageSize') queryParams.append('page_size', String(value));
        else if (key === 'content_type_app_label') queryParams.append('content_type__app_label', String(value));
        else if (key === 'content_type_model') queryParams.append('content_type__model', String(value));
        else queryParams.append(key, String(value));
      }
    });
  }
  // Assuming approval steps are under procurement API path
  const endpoint = `${API_PROCUREMENT_PATH}/approval-steps/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return (await authenticatedFetch(endpoint, { method: 'GET' })) as PaginatedResponse<ApprovalStep>;
};

export const approveApprovalStep = async (
  authenticatedFetch: AuthenticatedFetch,
  stepId: number,
  payload: ApprovalActionPayload
): Promise<ApprovalStep> => {
  const endpoint = `${API_PROCUREMENT_PATH}/approval-steps/${stepId}/approve/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })) as ApprovalStep;
};

export const rejectApprovalStep = async (
  authenticatedFetch: AuthenticatedFetch,
  stepId: number,
  payload: ApprovalActionPayload // Comments are mandatory for rejection via backend logic
): Promise<ApprovalStep> => {
  const endpoint = `${API_PROCUREMENT_PATH}/approval-steps/${stepId}/reject/`;
  return (await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })) as ApprovalStep;
};


/*
export const getOrderItems = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: { poId?: number; page?: number; pageSize?: number }
): Promise<PaginatedResponse<OrderItem>> => {
  const queryParams = new URLSearchParams();
  if (params?.poId) queryParams.append('purchase_order', params.poId.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('page_size', params.pageSize.toString());
  const endpoint = `${API_PROCUREMENT_PATH}/order-items/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

export const getOrderItemById = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<OrderItem> => {
  const endpoint = `${API_PROCUREMENT_PATH}/order-items/${id}/`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

export const createOrderItem = async (
  authenticatedFetch: AuthenticatedFetch,
  data: OrderItemData & { purchase_order: number }, // purchase_order FK required
): Promise<OrderItem> => {
  const endpoint = `${API_PROCUREMENT_PATH}/order-items/`;
  return await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const updateOrderItem = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  data: Partial<OrderItemData>,
): Promise<OrderItem> => {
  const endpoint = `${API_PROCUREMENT_PATH}/order-items/${id}/`;
  return await authenticatedFetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const deleteOrderItem = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<void> => {
  const endpoint = `${API_PROCUREMENT_PATH}/order-items/${id}/`;
  await authenticatedFetch(endpoint, { method: 'DELETE' });
};
*/
