'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { templateService } from '@/services/templateService';
import { useTranslation } from '@/providers/LanguageContext';
import { Loader2 } from 'lucide-react';

const EditorComponent = dynamic(
  () => import('@/components/editor/Editor'),
  { ssr: false }
);

export default function EditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  
  const projectId = params?.projectId as string;
  const templateId = searchParams?.get('templateId');

  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!projectId || projectId === 'new') {
          // Verifica se há um template pendente no localStorage (de importação)
          const pending = localStorage.getItem('pending_template');
          if (pending) {
            const data = JSON.parse(pending);
            setProjectData({
              id: `project-${Date.now()}`,
              name: data.name || 'Novo Projeto',
              width: data.width || 1080,
              height: data.height || 1080,
              fabric_json: data.fabric_json || null
            });
            // Opcional: mantemos no localStorage para fallbacks ou removemos
          } else {
            // Cria um projeto limpo padrão
            setProjectData({
              id: `project-${Date.now()}`,
              name: 'Novo Projeto',
              width: 800,
              height: 600,
              fabric_json: null
            });
          }
        } else {
          // Carrega o projeto salvo no banco/localStorage
          const project = await templateService.getProject(projectId);
          if (project) {
            setProjectData({
              id: project.id,
              name: project.name,
              width: project.width || 800,
              height: project.height || 600,
              fabric_json: project.fabric_json
            });
          } else {
            // Cria projeto padrão com esse id caso não exista
            setProjectData({
              id: projectId,
              name: 'Projeto Novo',
              width: 800,
              height: 600,
              fabric_json: null
            });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados no editor:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, templateId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#ECFFEB]/20 gap-4">
        <Loader2 className="w-12 h-12 text-[#27A300] animate-spin" />
        <p className="font-semibold text-green-800">A carregar o editor...</p>
      </div>
    );
  }

  return (
    <EditorComponent 
      projectId={projectData?.id}
      initialJson={projectData?.fabric_json}
      width={projectData?.width}
      height={projectData?.height}
      name={projectData?.name}
    />
  );
}
