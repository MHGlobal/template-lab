export type EditorId = 'editor' | 'viewer';

const editorMap: Record<string, EditorId> = {
  'social-media': 'editor',
  'business': 'editor',
  'events': 'editor',
  'documents': 'editor',
  'ecommerce': 'editor',
};

export function getEditorForCategory(category: string): EditorId {
  return editorMap[category] || 'editor';
}
