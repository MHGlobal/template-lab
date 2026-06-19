import { supabase } from '@/lib/supabase';
import { FabricTemplate } from '@/types';

// Nome das tabelas do Supabase (MVP)
const TEMPLATES_TABLE = 'templates';
const PROJECTS_TABLE = 'projects';

// Helper para verificar se o Supabase está configurado corretamente
const isSupabaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder-project')
  );
};

export const templateService = {
  /**
   * Obtém todos os templates.
   * Se o Supabase não estiver configurado, usa fallback local.
   */
  async getTemplates(): Promise<FabricTemplate[]> {
    if (!isSupabaseConfigured()) {
      return this.getLocalTemplates();
    }

    try {
      const { data, error } = await supabase
        .from(TEMPLATES_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar templates do Supabase, usando fallback local:', error);
      return this.getLocalTemplates();
    }
  },

  /**
   * Salva ou atualiza um template.
   */
  async saveTemplate(template: Omit<FabricTemplate, 'created_at' | 'updated_at'>): Promise<FabricTemplate> {
    if (!isSupabaseConfigured()) {
      return this.saveLocalTemplate(template);
    }

    try {
      const { data, error } = await supabase
        .from(TEMPLATES_TABLE)
        .upsert({
          id: template.id,
          name: template.name,
          category: template.category,
          thumbnail_url: template.thumbnail,
          width: template.width,
          height: template.height,
          tags: template.tags,
          fabric_json: template.fabric_json,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        category: data.category,
        thumbnail: data.thumbnail_url,
        width: data.width,
        height: data.height,
        tags: data.tags,
        fabric_json: data.fabric_json
      };
    } catch (error) {
      console.error('Erro ao salvar template no Supabase, usando fallback local:', error);
      return this.saveLocalTemplate(template);
    }
  },

  /**
   * Busca um projeto pelo ID.
   */
  async getProject(projectId: string): Promise<any> {
    if (!isSupabaseConfigured()) {
      return this.getLocalProject(projectId);
    }

    try {
      const { data, error } = await supabase
        .from(PROJECTS_TABLE)
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar projeto do Supabase, usando fallback local:', error);
      return this.getLocalProject(projectId);
    }
  },

  /**
   * Salva ou atualiza um projeto.
   */
  async saveProject(project: {
    id: string;
    user_id?: string;
    template_id?: string;
    name: string;
    thumbnail_url: string;
    status: 'editing' | 'exported' | 'published';
    fabric_json: any;
  }): Promise<any> {
    if (!isSupabaseConfigured()) {
      return this.saveLocalProject(project);
    }

    try {
      const { data, error } = await supabase
        .from(PROJECTS_TABLE)
        .upsert({
          id: project.id,
          user_id: project.user_id || null,
          template_id: project.template_id || null,
          name: project.name,
          thumbnail_url: project.thumbnail_url,
          status: project.status,
          fabric_json: project.fabric_json,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao salvar projeto no Supabase, usando fallback local:', error);
      return this.saveLocalProject(project);
    }
  },

  /**
   * Faz upload de arquivo para o Storage do Supabase.
   */
  async uploadFile(bucket: 'templates' | 'uploads' | 'exports', path: string, file: File): Promise<string> {
    if (!isSupabaseConfigured()) {
      // Retorna uma ObjectURL local para simulação
      return URL.createObjectURL(file);
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload para o Supabase Storage:', error);
      return URL.createObjectURL(file);
    }
  },

  // === FALLBACKS DE LOCALSTORAGE ===

  getLocalTemplates(): FabricTemplate[] {
    if (typeof window === 'undefined') return [];
    const local = localStorage.getItem('editja_templates');
    return local ? JSON.parse(local) : [];
  },

  saveLocalTemplate(template: Omit<FabricTemplate, 'created_at' | 'updated_at'>): FabricTemplate {
    if (typeof window === 'undefined') return template as FabricTemplate;
    const templates = this.getLocalTemplates();
    const updatedTemplates = templates.filter(t => t.id !== template.id);
    const newTemplate = { ...template } as FabricTemplate;
    updatedTemplates.push(newTemplate);
    localStorage.setItem('editja_templates', JSON.stringify(updatedTemplates));
    return newTemplate;
  },

  getLocalProjects(): any[] {
    if (typeof window === 'undefined') return [];
    const local = localStorage.getItem('editja_projects');
    return local ? JSON.parse(local) : [];
  },

  getLocalProject(projectId: string): any {
    const projects = this.getLocalProjects();
    return projects.find(p => p.id === projectId) || null;
  },

  saveLocalProject(project: any): any {
    if (typeof window === 'undefined') return project;
    const projects = this.getLocalProjects();
    const updatedProjects = projects.filter(p => p.id !== project.id);
    updatedProjects.push(project);
    localStorage.setItem('editja_projects', JSON.stringify(updatedProjects));
    return project;
  }
};
