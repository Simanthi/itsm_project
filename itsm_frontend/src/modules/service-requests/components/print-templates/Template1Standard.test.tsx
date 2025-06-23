/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Template1Standard from './Template1Standard';
import type { ServiceRequest } from '../../types/ServiceRequestTypes';
import { formatDate } from '../../../../utils/formatters';

// Mock company details
const mockCompanyDetails = {
  name: 'Test Corp',
  address: '123 Test St, Testville, TS 12345',
  logoUrl: '/test-logo.png',
};

// Mock service request data
const mockServiceRequest: ServiceRequest = {
  id: 1,
  request_id: 'SR-AA-0001',
  title: 'Test Request Title',
  description: 'This is a detailed test description for the service request.',
  status: 'new',
  category: 'software',
  priority: 'medium',
  resolution_notes: 'Resolved by testing.',
  created_at: '2023-01-15T10:00:00Z',
  updated_at: '2023-01-16T11:00:00Z',
  resolved_at: '2023-01-17T12:00:00Z',
  requested_by_username: 'testuser',
  requested_by_id: 101,
  assigned_to_username: 'testassignee',
  assigned_to_id: 202,
  catalog_item_name: 'Test Catalog Item',
  // Ensure all required fields from ServiceRequest type are present
};

// Mock for formatDate as it's used directly in the template
vi.mock('../../../../utils/formatters', () => ({
  formatDate: (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}));


describe('Template1Standard', () => {
  it('renders service request details correctly', () => {
    render(<Template1Standard request={mockServiceRequest} companyDetails={mockCompanyDetails} />);

    // Check company details
    expect(screen.getByText(mockCompanyDetails.name)).toBeInTheDocument();
    expect(screen.getByText(mockCompanyDetails.address)).toBeInTheDocument();
    expect(screen.getByAltText(`${mockCompanyDetails.name} Logo`)).toBeInTheDocument();

    // Check request ID and title
    expect(screen.getByText(mockServiceRequest.request_id)).toBeInTheDocument();
    expect(screen.getByText(mockServiceRequest.title)).toBeInTheDocument();

    // Check key fields in the table-like structure
    // Status needs special handling due to formatting in component
    expect(screen.getByText('New')).toBeInTheDocument(); // "new" becomes "New"
    expect(screen.getByText(mockServiceRequest.priority.toUpperCase())).toBeInTheDocument();
    expect(screen.getByText(mockServiceRequest.category.replace(/\b\w/g, (l) => l.toUpperCase()))).toBeInTheDocument();
    expect(screen.getByText(mockServiceRequest.catalog_item_name as string)).toBeInTheDocument();
    expect(screen.getByText(mockServiceRequest.requested_by_username)).toBeInTheDocument();
    expect(screen.getByText(mockServiceRequest.assigned_to_username as string)).toBeInTheDocument();

    // Check formatted dates
    expect(screen.getByText(formatDate(mockServiceRequest.created_at))).toBeInTheDocument();
    expect(screen.getByText(formatDate(mockServiceRequest.updated_at))).toBeInTheDocument();
    if (mockServiceRequest.resolved_at) {
      expect(screen.getByText(formatDate(mockServiceRequest.resolved_at))).toBeInTheDocument();
    }

    // Check description and resolution notes
    expect(screen.getByText(mockServiceRequest.description)).toBeInTheDocument();
    if (mockServiceRequest.resolution_notes) {
      expect(screen.getByText(mockServiceRequest.resolution_notes)).toBeInTheDocument();
    }
  });

  it('renders N/A for optional fields if not provided', () => {
    const minimalRequest: ServiceRequest = {
      ...mockServiceRequest,
      assigned_to_username: null,
      assigned_to_id: null,
      resolved_at: null,
      resolution_notes: null,
      catalog_item_name: undefined, // or null if that's how your type is
    };
    render(<Template1Standard request={minimalRequest} companyDetails={mockCompanyDetails} />);

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    // Check that resolved_at row is not present or shows N/A if the template handles it that way.
    // The current template structure for resolved_at means the row itself might not render if resolved_at is null.
    // So, we might assert its absence or how it's handled.
    // For catalog_item_name:
    expect(screen.getByText('N/A')).toBeInTheDocument();
    // For resolution_notes, the section might not render if null.
    expect(screen.queryByText('Resolution Notes:')).not.toBeInTheDocument();
  });
});
