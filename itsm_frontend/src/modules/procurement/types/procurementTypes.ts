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

export interface UserSummary {
  // Renamed from existing User to avoid conflict if Asset types also have User
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

  // New fields for PurchaseRequestMemo
  iom_id?: string | null; // Read-only, backend generated
  department?: number | null; // FK to Department
  department_name?: string | null; // Read-only
  project?: number | null; // FK to Project
  project_name?: string | null; // Read-only
  priority?: 'low' | 'medium' | 'high';
  required_delivery_date?: string | null; // ISO date string
  suggested_vendor?: number | null; // FK to Vendor
  suggested_vendor_name?: string | null; // Read-only
  attachments?: File | string | null; // File for upload, string for URL on read
}

export interface PurchaseRequestMemoData {
  // For POST (create)
  item_description: string;
  quantity: number;
  reason: string;
  estimated_cost?: number | null;
  // New fields for creation
  department?: number | null;
  project?: number | null;
  priority?: 'low' | 'medium' | 'high';
  required_delivery_date?: string | null;
  suggested_vendor?: number | null;
  attachments?: File | null; // On create, it's a File or null
}

export interface PurchaseRequestMemoUpdateData {
  // For PATCH (update)
  item_description?: string;
  quantity?: number;
  reason?: string;
  estimated_cost?: number | null;
  // New fields for update
  department?: number | null;
  project?: number | null;
  priority?: 'low' | 'medium' | 'high';
  required_delivery_date?: string | null;
  suggested_vendor?: number | null;
  attachments?: File | null; // Can also update attachment
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

export interface OrderItemData {
  // For creating/updating items within a PO
  id?: number; // For identifying existing items during update
  item_description: string;
  quantity: number;
  unit_price?: number | null;
}

export interface OrderItem extends OrderItemData {
  id: number; // Always present for existing items
  total_price: number; // Read-only from backend

  // New fields for OrderItem
  product_code?: string | null;
  gl_account?: number | null; // FK to GLAccount
  gl_account_code?: string | null; // Read-only (e.g., "6001 - Office Supplies")
  received_quantity?: number;
  line_item_status?: 'pending' | 'partially_received' | 'fully_received' | 'cancelled' | 'invoiced';
  tax_rate?: number | null; // Percentage, e.g., 16.00 for 16%
  // discount_percentage_or_amount?: number | null; // Removed
  discount_type?: 'fixed' | 'percentage' | null;
  discount_value?: number | null;
}

// Updated OrderItemData for creation/update to include new fields
export interface OrderItemData {
  id?: number;
  item_description: string;
  quantity: number;
  unit_price?: number | null;
  // New fields
  product_code?: string | null;
  gl_account?: number | null;
  received_quantity?: number;
  line_item_status?: 'pending' | 'partially_received' | 'fully_received' | 'cancelled' | 'invoiced';
  tax_rate?: number | null;
  // discount_percentage_or_amount?: number | null; // Removed
  discount_type?: 'fixed' | 'percentage' | null;
  discount_value?: number | null;
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

  // New fields for PurchaseOrder
  payment_terms?: string | null;
  shipping_method?: string | null;
  billing_address?: string | null;
  po_type?: 'goods' | 'services' | 'subscription' | 'framework_agreement' | null;
  related_contract?: number | null; // FK to Contract
  related_contract_details?: string | null; // Read-only, e.g., contract title or ID
  attachments?: File | string | null; // File for upload, string for URL on read
  revision_number?: number;
  currency?: string; // e.g., 'USD', 'KES'
}

export interface PurchaseOrderData {
  // For POST (create) and PATCH (update)
  po_number?: string; // Optional on create if backend generates it
  internal_office_memo?: number | null;
  vendor: number; // Required FK
  order_date?: string;
  expected_delivery_date?: string | null;
  status?: PurchaseOrderStatus;
  shipping_address?: string | null;
  notes?: string | null;
  order_items: OrderItemData[];

  // New fields for PO data
  payment_terms?: string | null;
  shipping_method?: string | null;
  billing_address?: string | null;
  po_type?: 'goods' | 'services' | 'subscription' | 'framework_agreement' | null;
  related_contract?: number | null;
  attachments?: File | null; // On create/update, it's a File or null
  revision_number?: number; // Likely managed by backend or specific actions
  currency?: string;
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
  [key: string]:
    | string
    | number
    | boolean
    | undefined
    | PurchaseOrderStatus
    | PurchaseOrderStatus[];
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

  // New fields for CheckRequest
  cr_id?: string | null; // Read-only, backend generated
  expense_category?: number | null; // FK to ExpenseCategory
  expense_category_name?: string | null; // Read-only
  is_urgent?: boolean;
  recurring_payment?: number | null; // FK to RecurringPayment
  recurring_payment_details?: string | null; // Read-only
  attachments?: File | string | null; // File for upload, string for URL on read
  currency?: string; // e.g., 'USD', 'KES'
}

export interface CheckRequestData {
  // For POST (creation)
  purchase_order?: number | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  amount: string; // Send as string for DecimalField precision
  payee_name: string;
  payee_address?: string | null;
  reason_for_payment: string;
  // New fields for CR creation
  expense_category?: number | null;
  is_urgent?: boolean;
  recurring_payment?: number | null;
  attachments?: File | null;
  currency?: string;
  // requested_by and initial status set by backend
}

export interface CheckRequestUpdateData {
  // For PATCH/PUT (updates)
  purchase_order?: number | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  amount?: string;
  payee_name?: string;
  payee_address?: string | null;
  reason_for_payment?: string;
  // New fields for CR update
  expense_category?: number | null;
  is_urgent?: boolean;
  recurring_payment?: number | null;
  attachments?: File | null;
  currency?: string;
  // Status and approval fields are typically managed by actions
}

export interface AccountsDecisionPayload {
  // For approve/reject by accounts
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
