// src/mocks/handlers/procurementHandlers.ts
import { http, HttpResponse } from 'msw';
import type { PurchaseOrder, PurchaseRequestMemo, ContractForDropdown, PaginatedResponse } from '../../modules/procurement/types/procurementTypes'; // Adjust path as needed
import type { Vendor } from '../../modules/assets/types/assetTypes'; // For vendor_details in mock PO

export const procurementHandlers = [
  // Handler for creating a Purchase Order
  http.post(`/procurement/purchase-orders/`, async () => {
    console.log('[MSW] POST /procurement/purchase-orders/ called');
    // Simulate successful PO creation
    const mockVendor: Vendor = { id: 1, name: 'Mock Vendor from MSW' }; // Simplified Vendor
    const mockCreatedPO: PurchaseOrder = {
      id: Date.now(), // Use timestamp for unique ID in mock
      po_number: `PO-MOCK-${Date.now()}`,
      vendor: mockVendor.id,
      vendor_details: mockVendor,
      order_date: new Date().toISOString(),
      status: 'pending_approval',
      total_amount: 150.00, // Match example test case
      order_items: [
        // Optionally include items if your component expects them in the response
        {
          id: 1,
          item_description: 'Test Item from MSW',
          quantity: 1,
          unit_price: 150.00,
          total_price: 150.00,
          // Add other required OrderItem fields with default values
          product_code: null,
          gl_account: null,
          gl_account_code: null,
          received_quantity: 0,
          line_item_status: 'pending',
          tax_rate: null,
          discount_type: null,
          discount_value: null,
        }
      ],
      created_by: 1,
      created_by_username: 'msw_user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      currency: 'USD',
      revision_number: 0,
      // Ensure all other non-optional fields from PurchaseOrder type are present
      shipping_address: null,
      notes: null,
      payment_terms: null,
      shipping_method: null,
      billing_address: null,
      po_type: null,
      related_contract: null,
      related_contract_details: null,
      attachments: null,
      internal_office_memo: null,
    };
    return HttpResponse.json(mockCreatedPO, { status: 201 });
  }),

  // Handler for fetching approved Purchase Request Memos
  http.get(`/procurement/memos/`, ({ request }: { request: HttpRequest }) => {
    console.log('[MSW] GET /procurement/memos/ called');
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    if (status === 'approved') {
      const mockApprovedMemos: PurchaseRequestMemo[] = [
        {
          id: 1, item_description: 'Approved IOM 1 (MSW)', quantity: 2, estimated_cost: 100,
          status: 'approved', reason: 'Urgent', requested_by: 1, requested_by_username: 'test', request_date: new Date().toISOString(),
          // Add other required fields for PurchaseRequestMemo
          iom_id: 'IM-001', department: null, project: null, priority: 'medium',
        },
      ];
      const response: PaginatedResponse<PurchaseRequestMemo> = {
        count: mockApprovedMemos.length, next: null, previous: null, results: mockApprovedMemos,
      };
      return HttpResponse.json(response);
    }
    // Default empty response if status is not 'approved' or not provided
    return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
  }),

  // Handler for fetching Contracts for Dropdown
  http.get(`/procurement/contracts/`, () => {
    console.log('[MSW] GET /procurement/contracts/ called');
    const mockContracts: ContractForDropdown[] = [
      { id: 1, contract_id: 'CTR-001', title: 'Main Contract (MSW)', vendor: 1, vendor_name: 'Vendor A' },
      { id: 2, contract_id: 'CTR-002', title: 'Service Agreement (MSW)', vendor: 2, vendor_name: 'Vendor B' },
    ];
     const response: PaginatedResponse<ContractForDropdown> = {
        count: mockContracts.length, next: null, previous: null, results: mockContracts,
      };
    return HttpResponse.json(response);
  }),

  // Handler for fetching Purchase Order by ID (for edit mode)
  http.get(`/procurement/purchase-orders/:poId`, ({ params }: { params: { poId: string } }) => {
    console.log(`[MSW] GET /procurement/purchase-orders/${params.poId} called`);
    const { poId } = params;
    // Simulate fetching a PO. You can make this more dynamic if needed.
    const mockVendor: Vendor = { id: 1, name: 'Mock Vendor for Edit (MSW)' };
    const mockPO: PurchaseOrder = {
      id: Number(poId),
      po_number: `PO-EDIT-${poId}`,
      vendor: mockVendor.id,
      vendor_details: mockVendor,
      order_date: '2024-07-01T00:00:00Z',
      status: 'draft',
      total_amount: 100.00,
      order_items: [{ id: 1, item_description: 'Existing Item 1 (MSW)', quantity: 2, unit_price: 50, total_price: 100, product_code: null, gl_account: null, gl_account_code: null, received_quantity: 0, line_item_status: 'pending', tax_rate: null, discount_type: null, discount_value: null, }],
      // Ensure order_items is always an array, even if empty, for safety:
      // order_items: poToReturn.order_items || [],
      created_by: 1,
      created_by_username: 'editor_user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      currency: 'USD',
      revision_number: 0,
      shipping_address: '123 Edit St',
      notes: 'Editing this PO',
      payment_terms: 'Net 30',
      shipping_method: 'Air',
      billing_address: '123 Edit St',
      po_type: 'goods',
      related_contract: null,
      related_contract_details: null,
      attachments: null,
      internal_office_memo: null,
    };
    return HttpResponse.json(mockPO);
  }),

  // Handler for creating a Purchase Request Memo (IOM) - SUCCESS
  http.post(`/procurement/memos/`, async ({ request }: { request: HttpRequest }) => {
    const data = await request.formData();
    console.log('[MSW GLOBAL SUCCESS HANDLER] POST /procurement/memos/ called with FormData:', data); // Added log
    const now = new Date().toISOString();
    // Simulate successful IOM creation
    const mockCreatedIOM: PurchaseRequestMemo = {
      id: Date.now(),
      iom_id: `IOM-MSW-${Date.now()}`,
      item_description: data.get('item_description') as string || 'Mock Item from MSW',
      quantity: Number(data.get('quantity')) || 1,
      estimated_cost: Number(data.get('estimated_cost')) || null,
      reason: data.get('reason') as string || 'Mock Reason',
      status: 'pending',
      priority: (data.get('priority') as PurchaseRequestMemo['priority']) || 'medium',
      request_date: now,
      required_delivery_date: data.get('required_delivery_date') as string || null,
      department: data.get('department') ? Number(data.get('department')) : null,
      project: data.get('project') ? Number(data.get('project')) : null,
      suggested_vendor: data.get('suggested_vendor') ? Number(data.get('suggested_vendor')) : null,
      // department_name, project_name, suggested_vendor_name would typically be populated by backend based on IDs
      attachments: data.has('attachments') ? `http://localhost/mock-attachment/${(data.get('attachments') as File).name}` : null,
      requested_by: 1, // Mock user ID
      requested_by_username: 'msw_user',
      // approver fields typically null on creation
      approver: null,
      approver_username: null,
      decision_date: null,
      approver_comments: null,
    };
    return HttpResponse.json(mockCreatedIOM, { status: 201 });
  }),

  // Handler for creating a Check Request - SUCCESS
  http.post(`/procurement/check-requests/`, async ({ request }: { request: HttpRequest }) => {
    const data = await request.formData();
    console.log('[MSW] POST /procurement/check-requests/ called with FormData:', data);
    const now = new Date().toISOString();
    const mockCreatedCR: any = { // Using 'any' for brevity, ensure it matches CheckRequest type
      id: Date.now(),
      cr_id: `CR-MSW-${Date.now()}`,
      payee_name: data.get('payee_name') as string || 'Mock Payee from MSW',
      amount: data.get('amount') as string || '0.00',
      reason_for_payment: data.get('reason_for_payment') as string || 'Mock Reason',
      status: 'pending_submission',
      request_date: now,
      currency: data.get('currency') as string || 'USD',
      invoice_date: data.get('invoice_date') as string || null,
      invoice_number: data.get('invoice_number') as string || null,
      payee_address: data.get('payee_address') as string || null,
      expense_category: data.get('expense_category') ? Number(data.get('expense_category')) : null,
      is_urgent: data.get('is_urgent') === 'true',
      recurring_payment: data.get('recurring_payment') ? Number(data.get('recurring_payment')) : null,
      attachments: data.has('attachments') ? `http://localhost/mock-attachment/${(data.get('attachments') as File).name}` : null,
      purchase_order: data.get('purchase_order') ? Number(data.get('purchase_order')) : null,
      requested_by: 1, // Mock user ID
      requested_by_username: 'msw_user',
      // Other fields usually null/default on creation
    };
    return HttpResponse.json(mockCreatedCR, { status: 201 });
  }),


];

// Export the handlers array
export default procurementHandlers;
