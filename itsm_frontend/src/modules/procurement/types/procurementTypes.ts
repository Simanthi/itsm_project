// itsm_frontend/src/modules/procurement/types/procurementTypes.ts

// From itsm_frontend/src/api/procurementApi.ts

// 1. Type alias for authenticatedFetch (if it's specific to procurement module, otherwise keep it general)
// For now, let's assume AuthenticatedFetch might be used more broadly, so it could stay in a more general api types file or be imported.
// If it's truly only for procurement, it can be moved here.
// export type AuthenticatedFetch = (
//   endpoint: string,
//   options?: RequestInit,
// ) => Promise<unknown>;

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
  status__in?: PurchaseOrderStatus[]; // Added this line
  vendor_id?: number;
  // Add other relevant filter fields
  [key: string]: string | number | boolean | undefined | PurchaseOrderStatus | PurchaseOrderStatus[];
}

// --- Check Request Types ---
export type CheckRequestStatus =
  | 'pending_submission'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'payment_processing'
  | 'paid'
  | 'cancelled';

export type PaymentMethod =
  | 'check'
  | 'ach'
  | 'wire'
  | 'cash'
  | 'credit_card'
  | 'other';

export interface CheckRequest {
  id: number;
  purchase_order?: number | null; // ID
  purchase_order_number?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null; // ISO date string
  amount: string; // Decimal as string from backend
  payee_name: string;
  payee_address?: string | null;
  reason_for_payment: string;
  requested_by: number; // ID
  requested_by_username: string;
  request_date: string; // ISO date string
  status: CheckRequestStatus;
  approved_by_accounts?: number | null; // ID
  approved_by_accounts_username?: string | null;
  accounts_approval_date?: string | null; // ISO date string
  accounts_comments?: string | null;
  payment_method?: PaymentMethod | null;
  payment_date?: string | null; // ISO date string
  transaction_id?: string | null;
  payment_notes?: string | null;
}

export interface CheckRequestData { // For POST (creation)
  purchase_order?: number | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  amount: string; // Send as string for DecimalField precision
  payee_name: string;
  payee_address?: string | null;
  reason_for_payment: string;
  // requested_by and initial status set by backend
}

export interface CheckRequestUpdateData { // For PATCH/PUT (updates)
  purchase_order?: number | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  amount?: string;
  payee_name?: string;
  payee_address?: string | null;
  reason_for_payment?: string;
  // Status and approval fields are typically managed by actions
}

export interface AccountsDecisionPayload { // For approve/reject by accounts
  comments?: string;
}

export interface ConfirmPaymentPayload {
  payment_method: PaymentMethod;
  payment_date: string; // ISO date string, e.g., YYYY-MM-DD
  transaction_id: string;
  payment_notes?: string;
}

// --- API Function Parameters (Check Request) ---
export interface GetCheckRequestsParams {
  page?: number;
  pageSize?: number;
  ordering?: string;
  status?: CheckRequestStatus;
  purchase_order_id?: number;
  requested_by_id?: number;
  [key: string]: string | number | boolean | undefined | CheckRequestStatus;
}

// Type alias for authenticatedFetch - decided to keep it here for now,
// as it's used by all API functions within this module.
// If a more global one exists, that should be preferred.
export type AuthenticatedFetch = (
  endpoint: string,
  options?: RequestInit,
) => Promise<unknown>; // Changed Promise<any> to Promise<unknown> for better type safety
