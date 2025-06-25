// src/mocks/handlers/procurementHandlers.ts
import { http, HttpResponse } from 'msw';
import type { PurchaseOrder, PurchaseRequestMemo, ContractForDropdown, PaginatedResponse } from '../../modules/procurement/types/procurementTypes'; // Adjust path as needed
import type { Vendor } from '../../modules/assets/types/assetTypes'; // For vendor_details in mock PO

const API_BASE_PATH = '/api'; // Define a common base path if your API routes share it, e.g. /api

export const procurementHandlers = [
  // Handler for creating a Purchase Order
  http.post(`${API_BASE_PATH}/procurement/purchase-orders/`, async () => {
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
      internal_office_memo_details: undefined, // Or a mock memo detail if needed by component
    };
    return HttpResponse.json(mockCreatedPO, { status: 201 });
  }),

  // Handler for fetching approved Purchase Request Memos
  http.get(`${API_BASE_PATH}/procurement/memos/`, ({request}) => {
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
  http.get(`${API_BASE_PATH}/procurement/contracts/`, () => {
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
  http.get(`${API_BASE_PATH}/procurement/purchase-orders/:poId`, ({ params }) => {
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
      internal_office_memo_details: undefined,
    };
    return HttpResponse.json(mockPO);
  }),
];

// Export the handlers array
export default procurementHandlers;
