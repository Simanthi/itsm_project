// itsm_frontend/src/modules/configs/types/ConfigurationItemTypes.ts

// Minimal representation of an Asset for linking within CI context
export interface LinkedAssetRepresentation {
  id: number;
  asset_tag: string;
  name: string;
}

export type CIType = 'server' | 'application' | 'database' | 'network_device' | 'storage' | 'service' | 'environment' | 'other';
export const CITypeOptions: CIType[] = ['server', 'application', 'database', 'network_device', 'storage', 'service', 'environment', 'other'];

export type CIStatus = 'active' | 'inactive' | 'deprecated' | 'maintenance';
export const CIStatusOptions: CIStatus[] = ['active', 'inactive', 'deprecated', 'maintenance'];

export type CICriticality = 'low' | 'medium' | 'high';
export const CICriticalityOptions: CICriticality[] = ['low', 'medium', 'high'];

export interface ConfigurationItem {
  id: number;
  name: string;
  ci_type: CIType;
  description?: string | null;
  status: CIStatus;
  linked_asset?: number | null; // ID of the linked asset (for writing)
  linked_asset_details?: LinkedAssetRepresentation | null; // Populated for reading
  related_cis: number[]; // Array of IDs for related CIs (used for writing)
  related_cis_ids?: number[]; // Array of IDs from backend (this is what 'related_cis' becomes on read due to serializer)
  version?: string | null;
  criticality: CICriticality;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface NewConfigurationItemData {
  name: string;
  ci_type: CIType;
  description?: string | null;
  status: CIStatus;
  linked_asset?: number | null; // Send ID of asset
  related_cis?: number[]; // Send array of CI IDs
  version?: string | null;
  criticality: CICriticality;
}
