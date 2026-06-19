import { z } from 'zod';

export type Category = 'social-media' | 'business' | 'events' | 'documents' | 'ecommerce';

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateTemplate = (data: any): TemplateValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic Structure Validation
  if (!data.id) errors.push('O template deve ter um ID.');
  if (!data.category) errors.push('O template deve ter uma categoria.');
  if (!data.width || !data.height) errors.push('Dimensões do canvas são obrigatórias.');

  const category = data.category as Category;

  // Category Specific Rules
  switch (category) {
    case 'social-media':
      validateSocialMedia(data, errors, warnings);
      break;
    case 'business':
      validateBusiness(data, errors, warnings);
      break;
    case 'events':
      validateEvents(data, errors, warnings);
      break;
    case 'documents':
      validateDocuments(data, errors, warnings);
      break;
    case 'ecommerce':
      validateEcommerce(data, errors, warnings);
      break;
  }

  // Common Validations
  validateCommon(data, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

function validateSocialMedia(data: any, errors: string[], warnings: string[]) {
  const isInstagramFeed = (data.width === 1080 && (data.height === 1080 || data.height === 1350));
  const isInstagramStory = (data.width === 1080 && data.height === 1920);

  if (!isInstagramFeed && !isInstagramStory) {
    warnings.push('Dimensões não correspondem aos padrões comuns do Instagram (1080x1080, 1080x1350 ou 1080x1920).');
  }

  if (isInstagramStory) {
    // Check safe zones (simplified heuristic)
    const objects = data.fabric_json?.objects || [];
    objects.forEach((obj: any) => {
      if (obj.top < 250 || obj.top > 1670) {
        warnings.push(`Objeto "${obj.type}" está fora da zona de segurança do Instagram Stories.`);
      }
    });
  }
}

function validateBusiness(data: any, errors: string[], warnings: string[]) {
  // A4 check
  const isA4 = (data.width === 2480 && data.height === 3508); // 300 DPI
  if (!isA4) {
    warnings.push('Template de marketing não está no padrão A4 (300 DPI).');
  }

  // Bleed area check (mock)
  if (!data.hasBleed) {
    warnings.push('Recomendado incluir área de sangria de 3mm para materiais impressos.');
  }
}

function validateEvents(data: any, errors: string[], warnings: string[]) {
  if (data.width < 1500) {
    warnings.push('Resolução pode ser baixa para impressão de convites/certificados (recomendado 300 DPI).');
  }
}

function validateDocuments(data: any, errors: string[], warnings: string[]) {
  // Check hierarchy/text size
  const objects = data.fabric_json?.objects || [];
  const texts = objects.filter((obj: any) => obj.type === 'i-text' || obj.type === 'text');
  
  if (texts.length === 0) {
    errors.push('Documentos profissionais devem conter texto.');
  }

  const smallTexts = texts.filter((t: any) => t.fontSize < 10);
  if (smallTexts.length > 0) {
    warnings.push('Existem textos com tamanho inferior a 10pt, o que pode dificultar a leitura.');
  }
}

function validateEcommerce(data: any, errors: string[], warnings: string[]) {
  const objects = data.fabric_json?.objects || [];
  const hasQrCode = objects.some((obj: any) => obj.type === 'image' && (obj.name === 'qr' || obj.src?.includes('qr')));
  
  if (hasQrCode) {
    // Simplified QR size check
    const qr = objects.find((obj: any) => obj.type === 'image' && (obj.name === 'qr' || obj.src?.includes('qr')));
    if (qr.width < 100) {
      warnings.push('QR Code pode ser muito pequeno para ser escaneado corretamente.');
    }
  }
}

function validateCommon(data: any, errors: string[], warnings: string[]) {
  const objects = data.fabric_json?.objects || [];
  
  // Overlapping text check (mock)
  // Image resolution check (mock)
  if (data.fileSize > 5 * 1024 * 1024) {
    warnings.push('O arquivo final pode ser muito pesado para carregamento web.');
  }
}
