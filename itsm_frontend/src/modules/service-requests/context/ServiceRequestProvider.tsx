// itsm_frontend/src/features/serviceRequests/context/ServiceRequestProvider.tsx

import { useState, type ReactNode } from "react";
import {
  type ServiceRequest,
  type NewServiceRequestFormData,
} from "../types/ServiceRequestTypes";
import { ServiceRequestContext } from "./ServiceRequestContext"; // Ensure this path is correct

// Mock Data (keep this as is)
const initialMockServiceRequests: ServiceRequest[] = [
  {
    id: "SR001",
    title: "Laptop repair",
    description: "My laptop screen is cracked.",
    status: "Open",
    requestedBy: "Alice Johnson",
    requestedDate: "2024-05-28",
  },
  {
    id: "SR002",
    title: "Software installation",
    description: "Need Photoshop installed on my new PC.",
    status: "In Progress",
    requestedBy: "Bob Smith",
    requestedDate: "2024-05-29",
  },
  {
    id: "SR003",
    title: "Network access issue",
    description: "Cannot connect to company shared drive.",
    status: "Resolved",
    requestedBy: "Charlie Brown",
    requestedDate: "2024-05-29",
  },
  {
    id: "SR004",
    title: "New employee onboarding",
    description: "Setup account for new hire, Jane Doe.",
    status: "Closed",
    requestedBy: "David Lee",
    requestedDate: "2024-05-30",
  },
  {
    id: "SR005",
    title: "Printer troubleshooting",
    description: "Office printer is offline in room 305.",
    status: "Open",
    requestedBy: "Eve Davis",
    requestedDate: "2024-06-01",
  },
  {
    id: "SR006",
    title: "Monitor calibration",
    description: "Need color calibration for design monitor.",
    status: "Open",
    requestedBy: "Frank White",
    requestedDate: "2024-06-02",
  },
  {
    id: "SR007",
    title: "Email configuration",
    description: "Issues setting up Outlook on new laptop.",
    status: "In Progress",
    requestedBy: "Grace Hall",
    requestedDate: "2024-06-02",
  },
  {
    id: "SR008",
    title: "System upgrade request",
    description: "Requesting OS upgrade to Windows 11.",
    status: "Open",
    requestedBy: "Henry Green",
    requestedDate: "2024-06-03",
  },
  {
    id: "SR009",
    title: "Password reset",
    description: "Forgot VPN password, need a reset.",
    status: "Resolved",
    requestedBy: "Ivy Black",
    requestedDate: "2024-06-03",
  },
  {
    id: "SR010",
    title: "Software license query",
    description: "Need to check status of Adobe Acrobat license.",
    status: "Closed",
    requestedBy: "Jack Blue",
    requestedDate: "2024-06-04",
  },
  {
    id: "SR011",
    title: "New Keyboard Request",
    description: "My old keyboard is broken, need a new one.",
    status: "Open",
    requestedBy: "Karen Grey",
    requestedDate: "2024-06-04",
  },
  {
    id: "SR012",
    title: "VPN connection issue",
    description: "VPN disconnects frequently from home.",
    status: "In Progress",
    requestedBy: "Liam Brown",
    requestedDate: "2024-06-05",
  },
  {
    id: "SR013",
    title: "Server access request",
    description: "Need access to Dev server for testing.",
    status: "Open",
    requestedBy: "Mia Davis",
    requestedDate: "2024-06-05",
  },
  {
    id: "SR014",
    title: "New Printer Setup",
    description: "Setting up a new network printer in Marketing.",
    status: "Closed",
    requestedBy: "Noah Green",
    requestedDate: "2024-06-06",
  },
  {
    id: "SR015",
    title: "Antivirus Update Failed",
    description: "Antivirus definitions not updating on desktop.",
    status: "Open",
    requestedBy: "Olivia White",
    requestedDate: "2024-06-06",
  },
  {
    id: "SR016",
    title: "Monitor Flicker",
    description: "External monitor flickers constantly.",
    status: "In Progress",
    requestedBy: "Peter Parker",
    requestedDate: "2024-06-07",
  },
  {
    id: "SR017",
    title: "Software Uninstall",
    description: "Need to uninstall old CAD software.",
    status: "Open",
    requestedBy: "Quinn Red",
    requestedDate: "2024-06-07",
  },
  {
    id: "SR018",
    title: "Headset Malfunction",
    description: "My company headset mic is not working.",
    status: "Resolved",
    requestedBy: "Rachel Green",
    requestedDate: "2024-06-08",
  },
  {
    id: "SR019",
    title: "New User Account",
    description: "Setup new user account for intern.",
    status: "Closed",
    requestedBy: "Steve Rogers",
    requestedDate: "2024-06-08",
  },
  {
    id: "SR020",
    title: "Scanner Not Working",
    description: "Office scanner not recognized by PC.",
    status: "Open",
    requestedBy: "Tina Fey",
    requestedDate: "2024-06-09",
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
    const newId = `SR${(serviceRequests.length + 1)
      .toString()
      .padStart(3, "0")}`;
    const newRequest: ServiceRequest = {
      ...newRequestData,
      id: newId,
      status: "Open",
      requestedDate:
        newRequestData.requestedDate || new Date().toISOString().slice(0, 10),
    };
    setServiceRequests((prevRequests) => [...prevRequests, newRequest]);
  };

  // NEW: Implement updateServiceRequest function
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
