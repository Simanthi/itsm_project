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

export interface UserSummary { // Renamed from existing User to avoid conflict if Asset types also have User
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

export interface PurchaseRequestMemo {
  id: number;
  item_description: string;
  quantity: number;
  reason: string;
  estimated_cost?: number | null;
  requested_by: number;
  requested_by_username: string;
  request_date: string;
  status: PurchaseRequestStatus;
  approver?: number | null;
  approver_username?: string | null;
  decision_date?: string | null;
  approver_comments?: string | null;
}

export interface PurchaseRequestMemoData {
  item_description: string;
  quantity: number;
  reason: string;
  estimated_cost?: number | null;
}

export interface PurchaseRequestMemoUpdateData {
  item_description?: string;
  quantity?: number;
  reason?: string;
  estimated_cost?: number | null;
}

export interface PurchaseRequestDecisionData {
  decision: 'approved' | 'rejected';
  comments?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- API Function Parameters (Memo) ---
export interface GetPurchaseRequestMemosParams {
  page?: number;
  pageSize?: number;
  ordering?: string;
  status?: PurchaseRequestStatus;
  requested_by_id?: number;
  [key: string]: string | number | boolean | undefined | PurchaseRequestStatus;
}

// --- Purchase Order & OrderItem Types ---

export interface OrderItemData { // For creating/updating items within a PO
  id?: number; // For identifying existing items during update
  item_description: string;
  quantity: number;
  unit_price?: number | null;
}

export interface OrderItem extends OrderItemData {
  id: number; // Always present for existing items
  total_price: number; // Read-only from backend
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'partially_received'
  | 'fully_received'
  | 'invoiced'
  | 'paid'
  | 'cancelled';

// Simplified Vendor type for nesting in PO, assuming VendorSerializer from assets app might be too heavy
export interface VendorSummary {
    id: number;
    name: string;
    // Add other essential fields like contact_person or email if needed for display in PO context
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  internal_office_memo?: number | null; // ID of the PurchaseRequestMemo
  // internal_office_memo_details?: PurchaseRequestMemo; // Optional: if deep nesting is configured
  vendor: number; // ID of the Vendor
  vendor_details: VendorSummary; // Using VendorSummary for nested read-only details
  order_date: string; // ISO date string
  expected_delivery_date?: string | null;
  total_amount: number; // Read-only, calculated by backend
  status: PurchaseOrderStatus;
  created_by: number; // ID of the User
  created_by_username: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  shipping_address?: string | null;
  notes?: string | null;
  order_items: OrderItem[];
}

export interface PurchaseOrderData { // For POST (create) and PATCH (update)
  po_number?: string; // Optional on create if backend generates it, required for update if not using ID in URL for PATCH
  internal_office_memo?: number | null;
  vendor: number; // Required FK
  order_date?: string; // Usually defaults on backend or set by user
  expected_delivery_date?: string | null;
  status?: PurchaseOrderStatus; // e.g., 'draft' or 'pending_approval' on create
  shipping_address?: string | null;
  notes?: string | null;
  order_items: OrderItemData[];
}

// --- API Function Parameters (PO) ---
export interface GetPurchaseOrdersParams {
  page?: number;
  pageSize?: number;
  ordering?: string;
  status?: PurchaseOrderStatus;
  vendor_id?: number;
  // Add other relevant filter fields
  [key: string]: string | number | boolean | undefined | PurchaseOrderStatus;
}


// 3. API Base Path
const API_PROCUREMENT_PATH = '/procurement';

// 4. API Client Functions (Memo - existing)

export const getPurchaseRequestMemos = async (
  authenticatedFetch: AuthenticatedFetch,
  params?: GetPurchaseRequestMemosParams,
): Promise<PaginatedResponse<PurchaseRequestMemo>> => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            if (key === 'pageSize') { // DRF uses 'page_size'
                queryParams.append('page_size', String(value));
            } else {
                queryParams.append(key, String(value));
            }
        }
    });
  }
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

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

export const getPurchaseRequestMemoById = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

export const updatePurchaseRequestMemo = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  data: Partial<PurchaseRequestMemoUpdateData>,
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/`;
  return await authenticatedFetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

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

export const cancelPurchaseRequestMemo = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<PurchaseRequestMemo> => {
  const endpoint = `${API_PROCUREMENT_PATH}/memos/${id}/cancel/`;
  return await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
};


// --- Purchase Order Functions ---

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
            } else if (key === 'vendor_id') { // Example of specific param name mapping
                queryParams.append('vendor', String(value));
            }
            else {
                queryParams.append(key, String(value));
            }
        }
    });
  }
  const endpoint = `${API_PROCUREMENT_PATH}/purchase-orders/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

export const createPurchaseOrder = async (
  authenticatedFetch: AuthenticatedFetch,
  data: PurchaseOrderData,
): Promise<PurchaseOrder> => {
  const endpoint = `${API_PROCUREMENT_PATH}/purchase-orders/`;
  return await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const getPurchaseOrderById = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<PurchaseOrder> => {
  const endpoint = `${API_PROCUREMENT_PATH}/purchase-orders/${id}/`;
  return await authenticatedFetch(endpoint, { method: 'GET' });
};

export const updatePurchaseOrder = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
  data: Partial<PurchaseOrderData>,
): Promise<PurchaseOrder> => {
  const endpoint = `${API_PROCUREMENT_PATH}/purchase-orders/${id}/`;
  return await authenticatedFetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const deletePurchaseOrder = async (
  authenticatedFetch: AuthenticatedFetch,
  id: number,
): Promise<void> => {
  const endpoint = `${API_PROCUREMENT_PATH}/purchase-orders/${id}/`;
  await authenticatedFetch(endpoint, { method: 'DELETE' });
};


// --- (Optional) OrderItem Functions ---
// These functions would interact with '/procurement/order-items/' endpoint if needed directly.
// For now, OrderItems are primarily managed via the nested PurchaseOrder serializer.

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
