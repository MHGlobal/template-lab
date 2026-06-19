export type TemplateCategory = 'social-media' | 'business' | 'events' | 'documents' | 'ecommerce';

export interface FabricTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  thumbnail: string;
  width: number;
  height: number;
  tags: string[];
  fabric_json: any; // Fabric.js JSON structure
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
