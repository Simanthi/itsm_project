// src/mocks/handlers/assetHandlers.ts
import { http, HttpResponse } from 'msw';
import type { Vendor } from '../../modules/assets/types/assetTypes'; // Adjust path as needed
import type { PaginatedResponse } from '../../modules/procurement/types/procurementTypes'; // Assuming generic PaginatedResponse

const API_ASSET_PATH = '/api/assets'; // Assuming your API base path for assets

export const assetHandlers = [
  http.get(`${API_ASSET_PATH}/vendors/`, () => {
    console.log('[MSW] GET /api/assets/vendors/ called');
    const mockVendors: Vendor[] = [
      { id: 1, name: "Test Vendor 1 (MSW)" }, // Ensure Vendor type here matches definition if it has more required fields
      { id: 2, name: "Another Vendor (MSW)" },
    ];
    // Use the imported PaginatedResponse type
    const response: PaginatedResponse<Vendor> = {
      count: mockVendors.length,
      next: null,
      previous: null,
      results: mockVendors,
    };
    return HttpResponse.json(response);
  }),

  // Add other asset handlers here
];

export default assetHandlers;
