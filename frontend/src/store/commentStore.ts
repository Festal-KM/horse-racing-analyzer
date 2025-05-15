'use client';

import { create } from 'zustand';
import { commentApi, CommentData, CommentUpdateData } from '@/lib/api';

// 型定義
export interface Comment {
  id: number;
  race_id: number;
  horse_id: number;
  content: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type CommentCreate = Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'is_public'>;

interface CommentState {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  
  // アクション
  fetchComments: (raceId?: number, horseId?: number) => Promise<void>;
  createComment: (data: CommentData) => Promise<Comment | null>;
  updateComment: (commentId: number, data: CommentUpdateData) => Promise<Comment | null>;
  deleteComment: (commentId: number) => Promise<boolean>;
  reset: () => void;
}

// デバウンス関数（未使用のため削除）
// const debounce = <F extends (...args: any[]) => any>(
//   func: F,
//   wait: number
// ): ((...args: Parameters<F>) => void) => {
//   let timeout: NodeJS.Timeout | null = null;
//   
//   return (...args: Parameters<F>) => {
//     if (timeout) clearTimeout(timeout);
//     timeout = setTimeout(() => func(...args), wait);
//   };
// };

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  isLoading: false,
  error: null,
  
  fetchComments: async (raceId?: number, horseId?: number) => {
    try {
      set({ isLoading: true, error: null });
      
      const params: { race_id?: number; horse_id?: number; } = {};
      if (raceId) params.race_id = raceId;
      if (horseId) params.horse_id = horseId;
      
      const comments = await commentApi.getComments(params);
      set({ comments, isLoading: false });
    } catch (error) {
      console.error('コメント取得エラー:', error);
      set({ 
        error: error instanceof Error ? error.message : '不明なエラーが発生しました', 
        isLoading: false 
      });
    }
  },
  
  createComment: async (data: CommentData) => {
    try {
      set({ isLoading: true, error: null });
      
      const newComment = await commentApi.createComment(data);
      
      // 既存のコメント一覧に追加
      set(state => ({
        comments: [...state.comments, newComment],
        isLoading: false
      }));
      
      return newComment;
    } catch (error) {
      console.error('コメント作成エラー:', error);
      set({ 
        error: error instanceof Error ? error.message : '不明なエラーが発生しました', 
        isLoading: false 
      });
      return null;
    }
  },
  
  updateComment: async (commentId: number, data: CommentUpdateData) => {
    try {
      set({ isLoading: true, error: null });
      
      const updatedComment = await commentApi.updateComment(commentId, data);
      
      // 既存のコメント一覧を更新
      set(state => ({
        comments: state.comments.map(c => 
          c.id === commentId ? updatedComment : c
        ),
        isLoading: false
      }));
      
      return updatedComment;
    } catch (error) {
      console.error('コメント更新エラー:', error);
      set({ 
        error: error instanceof Error ? error.message : '不明なエラーが発生しました', 
        isLoading: false 
      });
      return null;
    }
  },
  
  deleteComment: async (commentId: number) => {
    try {
      set({ isLoading: true, error: null });
      
      await commentApi.deleteComment(commentId);
      
      // 削除したコメントを一覧から除外
      set(state => ({
        comments: state.comments.filter(c => c.id !== commentId),
        isLoading: false
      }));
      
      return true;
    } catch (error) {
      console.error('コメント削除エラー:', error);
      set({ 
        error: error instanceof Error ? error.message : '不明なエラーが発生しました', 
        isLoading: false 
      });
      return false;
    }
  },
  
  reset: () => {
    set({ comments: [], isLoading: false, error: null });
  }
})); 