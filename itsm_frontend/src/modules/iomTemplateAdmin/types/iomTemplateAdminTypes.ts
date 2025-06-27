// Defines types related to IOM Template administration for the frontend.

// Re-using AuthenticatedFetch type if defined globally, or define here.
// Assuming AuthenticatedFetch is:
// export type AuthenticatedFetch = (endpoint: string, options?: RequestInit) => Promise<any>;
// And PaginatedResponse is:
// export interface PaginatedResponse<T> { count: number; next: string | null; previous: string | null; results: T[]; }
// These might come from a shared types file like 'src/types/apiTypes.ts' or similar.
// For now, we'll assume they are available globally or imported where genericIomApi.ts is defined.

export interface IOMCategory {
  id: number;
  name: string;
  description?: string | null;
}

// For fields_definition, we expect a list of field definition objects.
// This is a simplified version for the frontend; backend validates the structure more deeply.
export interface FieldDefinition {
  name: string;
  label: string;
  type: string; // e.g., "text_short", "textarea", "number", "date", "choice_single", "user_selector_single" etc.
  required?: boolean;
  defaultValue?: unknown; // Changed from any to unknown for better type safety
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string | number; label: string }>;
  section?: string; // "header" | "body" | "footer"
  readonly?: boolean;
  // Record<string, any> is often acceptable for HTML attributes due to their diverse nature.
  // Could be narrowed to Record<string, string | number | boolean | undefined> if desired.
  attributes?: Record<string, any>;
  api_source?: { // For dynamic dropdowns
      endpoint: string;
      value_field: string;
      label_field: string;
  };
}

export interface IOMTemplate {
  id: number;
  name: string;
  description?: string | null;
  category?: number | null; // Category ID
  category_name?: string | null; // Read-only from backend
  fields_definition: FieldDefinition[];
  approval_type: 'none' | 'simple' | 'advanced';
  simple_approval_user?: number | null; // User ID
  simple_approval_user_details?: { id: number; username: string; name?:string }; // Optional details for display
  simple_approval_group?: number | null; // Group ID
  simple_approval_group_details?: { id: number; name: string }; // Optional details for display
  is_active: boolean;
  created_by?: number; // User ID
  created_by_username?: string | null; // Read-only
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

// Data for creating an IOMTemplate
export interface IOMTemplateCreateData {
  name: string;
  description?: string | null;
  category?: number | null;
  fields_definition: FieldDefinition[];
  approval_type: 'none' | 'simple' | 'advanced';
  simple_approval_user?: number | null;
  simple_approval_group?: number | null;
  is_active?: boolean; // Default to true on backend if not provided
}

// Data for updating an IOMTemplate (all fields optional)
export type IOMTemplateUpdateData = Partial<IOMTemplateCreateData>;

// Params for fetching IOMTemplates list
export interface GetIomTemplatesParams {
  page?: number;
  pageSize?: number;
  ordering?: string;
  category_id?: number;
  is_active?: boolean;
  name?: string; // For searching by name
  // Add other potential filter params
}

// It's good practice to also define the structure for PaginatedResponse if not globally available
// For example:
// export interface PaginatedResponse<T> {
//   count: number;
//   next: string | null;
//   previous: string | null;
//   results: T[];
// }
