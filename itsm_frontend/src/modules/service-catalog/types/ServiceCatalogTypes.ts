export interface CatalogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
}

export interface CatalogItem {
  id: number;
  name: string;
  slug: string;
  category: number; // Category ID
  category_name?: string;
  short_description: string;
  full_description?: string | null;
  estimated_fulfillment_time?: string | null;
  icon_url?: string | null;
  is_active: boolean;
}
