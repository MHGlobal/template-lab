'use client';

import { useState, useCallback } from 'react';

export interface Comment {
  id: string;
  objectId: string;
  text: string;
  author: string;
  createdAt: number;
  resolved: boolean;
}

export function useComments() {
  const [comments, setComments] = useState<Comment[]>([]);

  const addComment = useCallback((objectId: string, text: string, author = 'User') => {
    const comment: Comment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      objectId, text, author, createdAt: Date.now(), resolved: false,
    };
    setComments(prev => [...prev, comment]);
  }, []);

  const resolveComment = useCallback((id: string) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: true } : c));
  }, []);

  const deleteComment = useCallback((id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
  }, []);

  const getCommentsForObject = useCallback((objectId: string) => {
    return comments.filter(c => c.objectId === objectId);
  }, [comments]);

  return { comments, addComment, resolveComment, deleteComment, getCommentsForObject };
}
