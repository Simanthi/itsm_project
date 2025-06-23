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

// Base OrderItem fields used for both display (OrderItem) and data submission (OrderItemData)
interface OrderItemBase {
  item_description: string;
  quantity: number;
  unit_price?: number | null;
  product_code?: string | null;
  gl_account?: number | null; // FK to GLAccount
  received_quantity?: number;
  line_item_status?: 'pending' | 'partially_received' | 'fully_received' | 'cancelled' | 'invoiced';
  tax_rate?: number | null; // Percentage, e.g., 16.00 for 16%
  discount_type?: 'fixed' | 'percentage' | null;
  discount_value?: number | null;
}

export interface OrderItemData extends OrderItemBase {
  // For creating/updating items within a PO
  id?: number; // For identifying existing items during update
}

export interface OrderItem extends OrderItemBase {
  id: number; // Always present for existing items
  total_price: number; // Read-only from backend
  gl_account_code?: string | null; // Read-only (e.g., "6001 - Office Supplies")
}

// No need to redefine OrderItemData, it's correctly defined above by extending OrderItemBase.
// However, the previous re-declaration of OrderItemData was removed, which is correct.
// The issue might be that OrderItemData (the one extending OrderItemBase) is not seen by other files,
// or OrderItem (the display type) is being used where OrderItemData (submission type) is expected.
// Let's ensure OrderItemData is explicitly exported and clearly distinguished if necessary.
// For clarity, I'll ensure OrderItemData is defined as it was intended for data submission.

/*
This was the structure that worked before splitting OrderItemBase:
export interface OrderItemData {
  id?: number;
  item_description: string;
  quantity: number;
  unit_price?: number | null;
  product_code?: string | null;
  gl_account?: number | null;
  received_quantity?: number;
  line_item_status?: 'pending' | 'partially_received' | 'fully_received' | 'cancelled' | 'invoiced';
  tax_rate?: number | null;
  discount_type?: 'fixed' | 'percentage' | null;
  discount_value?: number | null;
}
Let's revert OrderItemData to this explicit structure if the OrderItemBase extension is problematic for TS resolution in other files.
Given the errors, it seems the split might be causing issues with how OrderItemData is recognized or used.
I'll redefine OrderItemData explicitly to ensure all its intended fields are directly on it.
*/

// Re-defining OrderItemData explicitly to ensure all fields are directly available
// This reverts the OrderItemBase abstraction for OrderItemData if it was causing resolution issues.
// export interface OrderItemData { // Keep the one that extends OrderItemBase
//   id?: number; // For identifying existing items during update
//   item_description: string;
//   quantity: number;
//   unit_price?: number | null;
//   product_code?: string | null;
//   gl_account?: number | null; // FK to GLAccount
//   received_quantity?: number;
//   line_item_status?: 'pending' | 'partially_received' | 'fully_received' | 'cancelled' | 'invoiced';
//   tax_rate?: number | null; // Percentage, e.g., 16.00 for 16%
//   discount_type?: 'fixed' | 'percentage' | null;
//   discount_value?: number | null;
// }
// The above re-definition is commented out because the existing OrderItemData extends OrderItemBase, which should be fine.
// The problem is likely in the component's usage or its own state type definition.

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


// --- Common Model Types (Basic definitions for dropdowns/FKs) ---

export interface Department {
  id: number;
  name: string;
  department_code?: string;
}

export interface Project {
  id: number;
  name: string;
  project_code?: string;
}

export interface ContractForDropdown {
  id: number;
  contract_id?: string;
  title?: string;
  vendor?: number;
  vendor_name?: string;
}

export interface GLAccount {
  id: number;
  name: string;
  account_code?: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
}

export interface RecurringPaymentForDropdown {
  id: number;
  payment_name?: string;
  vendor?: number;
  vendor_name?: string;
  amount?: number | string;
  currency?: string;
}

// Note: The main 'Vendor' type is typically sourced from assets module (e.g., assetApi.ts or a shared types file).
// If procurementApi.ts specifically needs a Vendor type from *this* file for some reason (e.g. a simplified version for a dropdown),
// it would be defined here. However, PurchaseRequestMemoForm.tsx correctly imports Vendor from assetApi.ts.
// The errors listed for procurementApi.ts suggest it *expects* these common types (Department, Project etc.) from this file.
