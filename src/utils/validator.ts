import { FabricTemplate, ValidationResult } from '@/types';

export const validateTemplate = (data: any): ValidationResult => {
  const errors: string[] = [];

  if (!data.id) errors.push('Missing ID');
  if (!data.name) errors.push('Missing Name');
  if (!data.category) errors.push('Missing Category');
  if (!data.width) errors.push('Missing Width');
  if (!data.height) errors.push('Missing Height');
  if (!data.fabric_json) errors.push('Missing fabric_json');
  
  const validCategories = ['social-media', 'business', 'events', 'documents', 'ecommerce'];
  if (data.category && !validCategories.includes(data.category)) {
    errors.push(`Invalid Category: ${data.category}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
