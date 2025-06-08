// itsm_frontend/src/features/serviceRequests/context/ServiceRequestProvider.tsx

import { useState, type ReactNode } from "react";
import {
  type ServiceRequest,
  type NewServiceRequestFormData,
  // REMOVED: ServiceRequestStatus, ServiceRequestCategory, ServiceRequestPriority
  // These types are used indirectly via ServiceRequest and NewServiceRequestFormData
  // So they don't need to be directly imported here.
} from "../types/ServiceRequestTypes";
import { ServiceRequestContext } from "./ServiceRequestContext"; // Ensure this path is correct

// Mock Data (updated to match new ServiceRequest type based on Django model)
const initialMockServiceRequests: ServiceRequest[] = [
  {
    id: "SR001",
    request_id: "SR-AA-0001", // New field
    title: "Laptop repair",
    description: "My laptop screen is cracked.",
    status: "new", // Changed from "Open" to "new"
    category: "hardware", // New field
    priority: "high", // New field
    resolution_notes: null,
    created_at: "2024-05-28T10:00:00Z", // New field, ISO string
    updated_at: "2024-05-28T10:00:00Z", // New field, ISO string
    resolved_at: null,
    requested_by: 101, // Mock User ID
    assigned_to: null,
  },
  {
    id: "SR002",
    request_id: "SR-AB-0002",
    title: "Software installation",
    description: "Need Photoshop installed on my new PC.",
    status: "in_progress", // Changed from "In Progress"
    category: "software",
    priority: "medium",
    resolution_notes: null,
    created_at: "2024-05-29T11:30:00Z",
    updated_at: "2024-05-29T11:30:00Z",
    resolved_at: null,
    requested_by: 102,
    assigned_to: 201, // Mock assigned user ID
  },
  {
    id: "SR003",
    request_id: "SR-AC-0003",
    title: "Network access issue",
    description: "Cannot connect to company shared drive.",
    status: "resolved", // Changed from "Resolved"
    category: "network",
    priority: "high",
    resolution_notes: "Provided VPN access.",
    created_at: "2024-05-29T14:00:00Z",
    updated_at: "2024-05-29T16:00:00Z",
    resolved_at: "2024-05-29T16:00:00Z",
    requested_by: 103,
    assigned_to: 202,
  },
  {
    id: "SR004",
    request_id: "SR-AD-0004",
    title: "New employee onboarding",
    description: "Setup account for new hire, Jane Doe.",
    status: "closed", // Changed from "Closed"
    category: "account",
    priority: "medium",
    resolution_notes: "Account created and welcome email sent.",
    created_at: "2024-05-30T09:00:00Z",
    updated_at: "2024-05-30T10:00:00Z",
    resolved_at: "2024-05-30T10:00:00Z",
    requested_by: 104,
    assigned_to: 201,
  },
  {
    id: "SR005",
    request_id: "SR-AE-0005",
    title: "Printer troubleshooting",
    description: "Office printer is offline in room 305.",
    status: "new", // Changed from "Open"
    category: "hardware",
    priority: "low",
    resolution_notes: null,
    created_at: "2024-06-01T08:00:00Z",
    updated_at: "2024-06-01T08:00:00Z",
    resolved_at: null,
    requested_by: 105,
    assigned_to: null,
  },
  {
    id: "SR006",
    request_id: "SR-AF-0006",
    title: "Monitor calibration",
    description: "Need color calibration for design monitor.",
    status: "new",
    category: "hardware",
    priority: "medium",
    resolution_notes: null,
    created_at: "2024-06-02T10:00:00Z",
    updated_at: "2024-06-02T10:00:00Z",
    resolved_at: null,
    requested_by: 106,
    assigned_to: null,
  },
  {
    id: "SR007",
    request_id: "SR-AG-0007",
    title: "Email configuration",
    description: "Issues setting up Outlook on new laptop.",
    status: "in_progress",
    category: "software",
    priority: "high",
    resolution_notes: null,
    created_at: "2024-06-02T14:00:00Z",
    updated_at: "2024-06-02T14:00:00Z",
    resolved_at: null,
    requested_by: 107,
    assigned_to: 202,
  },
  {
    id: "SR008",
    request_id: "SR-AH-0008",
    title: "System upgrade request",
    description: "Requesting OS upgrade to Windows 11.",
    status: "new",
    category: "software",
    priority: "medium",
    resolution_notes: null,
    created_at: "2024-06-03T09:00:00Z",
    updated_at: "2024-06-03T09:00:00Z",
    resolved_at: null,
    requested_by: 108,
    assigned_to: null,
  },
  {
    id: "SR009",
    request_id: "SR-AI-0009",
    title: "Password reset",
    description: "Forgot VPN password, need a reset.",
    status: "resolved",
    category: "account",
    priority: "high",
    resolution_notes: "Password reset and new one provided.",
    created_at: "2024-06-03T11:00:00Z",
    updated_at: "2024-06-03T11:30:00Z",
    resolved_at: "2024-06-03T11:30:00Z",
    requested_by: 109,
    assigned_to: 201,
  },
  {
    id: "SR010",
    request_id: "SR-AJ-0010",
    title: "Software license query",
    description: "Need to check status of Adobe Acrobat license.",
    status: "closed",
    category: "information",
    priority: "low",
    resolution_notes: "License status confirmed.",
    created_at: "2024-06-04T09:00:00Z",
    updated_at: "2024-06-04T10:00:00Z",
    resolved_at: "2024-06-04T10:00:00Z",
    requested_by: 110,
    assigned_to: 203,
  },
  {
    id: "SR011",
    request_id: "SR-AK-0011",
    title: "New Keyboard Request",
    description: "My old keyboard is broken, need a new one.",
    status: "new",
    category: "hardware",
    priority: "medium",
    resolution_notes: null,
    created_at: "2024-06-04T13:00:00Z",
    updated_at: "2024-06-04T13:00:00Z",
    resolved_at: null,
    requested_by: 111,
    assigned_to: null,
  },
  {
    id: "SR012",
    request_id: "SR-AL-0012",
    title: "VPN connection issue",
    description: "VPN disconnects frequently from home.",
    status: "in_progress",
    category: "network",
    priority: "high",
    resolution_notes: null,
    created_at: "2024-06-05T09:00:00Z",
    updated_at: "2024-06-05T09:00:00Z",
    resolved_at: null,
    requested_by: 112,
    assigned_to: 202,
  },
  {
    id: "SR013",
    request_id: "SR-AM-0013",
    title: "Server access request",
    description: "Need access to Dev server for testing.",
    status: "new",
    category: "account",
    priority: "medium",
    resolution_notes: null,
    created_at: "2024-06-05T15:00:00Z",
    updated_at: "2024-06-05T15:00:00Z",
    resolved_at: null,
    requested_by: 113,
    assigned_to: null,
  },
  {
    id: "SR014",
    request_id: "SR-AN-0014",
    title: "New Printer Setup",
    description: "Setting up a new network printer in Marketing.",
    status: "closed",
    category: "hardware",
    priority: "low",
    resolution_notes: "New printer installed and configured.",
    created_at: "2024-06-06T10:00:00Z",
    updated_at: "2024-06-06T11:00:00Z",
    resolved_at: "2024-06-06T11:00:00Z",
    requested_by: 114,
    assigned_to: 203,
  },
  {
    id: "SR015",
    request_id: "SR-AO-0015",
    title: "Antivirus Update Failed",
    description: "Antivirus definitions not updating on desktop.",
    status: "new",
    category: "software",
    priority: "high",
    resolution_notes: null,
    created_at: "2024-06-06T14:00:00Z",
    updated_at: "2024-06-06T14:00:00Z",
    resolved_at: null,
    requested_by: 115,
    assigned_to: null,
  },
  {
    id: "SR016",
    request_id: "SR-AP-0016",
    title: "Monitor Flicker",
    description: "External monitor flickers constantly.",
    status: "in_progress",
    category: "hardware",
    priority: "medium",
    resolution_notes: null,
    created_at: "2024-06-07T09:00:00Z",
    updated_at: "2024-06-07T09:00:00Z",
    resolved_at: null,
    requested_by: 116,
    assigned_to: 201,
  },
  {
    id: "SR017",
    request_id: "SR-AQ-0017",
    title: "Software Uninstall",
    description: "Need to uninstall old CAD software.",
    status: "new",
    category: "software",
    priority: "low",
    resolution_notes: null,
    created_at: "2024-06-07T11:00:00Z",
    updated_at: "2024-06-07T11:00:00Z",
    resolved_at: null,
    requested_by: 117,
    assigned_to: null,
  },
  {
    id: "SR018",
    request_id: "SR-AR-0018",
    title: "Headset Malfunction",
    description: "My company headset mic is not working.",
    status: "resolved",
    category: "hardware",
    priority: "high",
    resolution_notes: "Replaced headset.",
    created_at: "2024-06-08T10:00:00Z",
    updated_at: "2024-06-08T10:30:00Z",
    resolved_at: "2024-06-08T10:30:00Z",
    requested_by: 118,
    assigned_to: 202,
  },
  {
    id: "SR019",
    request_id: "SR-AS-0019",
    title: "New User Account",
    description: "Setup new user account for intern.",
    status: "closed",
    category: "account",
    priority: "medium",
    resolution_notes: "Account created successfully.",
    created_at: "2024-06-08T14:00:00Z",
    updated_at: "2024-06-08T15:00:00Z",
    resolved_at: "2024-06-08T15:00:00Z",
    requested_by: 119,
    assigned_to: 203,
  },
  {
    id: "SR020",
    request_id: "SR-AT-0020",
    title: "Scanner Not Working",
    description: "Office scanner not recognized by PC.",
    status: "new",
    category: "hardware",
    priority: "medium",
    resolution_notes: null,
    created_at: "2024-06-09T09:00:00Z",
    updated_at: "2024-06-09T09:00:00Z",
    resolved_at: null,
    requested_by: 120,
    assigned_to: null,
  },
];

interface ServiceRequestProviderProps {
  children: ReactNode;
}

export const ServiceRequestProvider = ({
  children,
}: ServiceRequestProviderProps) => {
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(
    initialMockServiceRequests
  );

  const addServiceRequest = (newRequestData: NewServiceRequestFormData) => {
    // Generate mock IDs and timestamps for the new request
    const newId = `SR${(serviceRequests.length + 1).toString().padStart(3, "0")}`;
    const newRequestId = `SR-M-${(serviceRequests.length + 1).toString().padStart(4, "0")}`; // Mock for Django's custom request_id
    const now = new Date().toISOString(); // Current timestamp for created_at and updated_at

    const newRequest: ServiceRequest = {
      id: newId, // Frontend mock ID
      request_id: newRequestId, // Frontend mock for custom request ID
      title: newRequestData.title,
      description: newRequestData.description,
      status: newRequestData.status, // Uses status from form data (which defaults to 'new')
      category: newRequestData.category, // Uses category from form data
      priority: newRequestData.priority, // Uses priority from form data
      resolution_notes: null, // Default to null for new requests
      created_at: now, // Mocking backend's auto_now_add
      updated_at: now, // Mocking backend's auto_now
      resolved_at: null, // Default to null for new requests
      requested_by: 1, // Mocking a user ID (e.g., assuming user with ID 1 is logged in)
      assigned_to: null, // Default to null for new requests
    };
    setServiceRequests((prevRequests) => [...prevRequests, newRequest]);
  };

  const updateServiceRequest = (updatedRequest: ServiceRequest) => {
    setServiceRequests((prevRequests) =>
      prevRequests.map((request) =>
        request.id === updatedRequest.id ? updatedRequest : request
      )
    );
  };

  return (
    <ServiceRequestContext.Provider
      value={{ serviceRequests, addServiceRequest, updateServiceRequest }}
    >
      {children}
    </ServiceRequestContext.Provider>
  );
};