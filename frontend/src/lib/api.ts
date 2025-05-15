import axios from 'axios';

// 環境変数からAPIエンドポイントを取得、なければデフォルト値を使用
const baseURL = 
  process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production'
    ? 'https://horse-racing-api.onrender.com'
    : 'http://localhost:8000');

// 本番環境でのみログ出力
if (process.env.NODE_ENV !== 'production') {
  console.log('Using API URL:', baseURL);
}

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// レスポンスインターセプター
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 本番環境では簡潔なエラーのみ表示
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export default api;

// コメント関連の型
export interface CommentData {
  race_id: number;
  horse_id: number;
  content: string;
  is_public?: boolean;
}

export interface CommentUpdateData {
  content?: string;
  is_public?: boolean;
}

// 馬券購入結果関連の型
export interface BettingResultData {
  race_id: number;
  bet_type: string;  // 単勝・複勝・馬連 など
  bet_numbers: string;  // "1" や "1-3" など
  amount: number;
  is_won?: boolean;
  payout?: number;
}

export interface BettingResultUpdateData {
  is_won?: boolean;
  payout?: number;
}

// 統計データ関連の型
export interface StatsData {
  id: number;
  category: string;
  condition: string;
  bet_count: number;
  win_count: number;
  total_bet: number;
  total_payout: number;
  roi: number;
  calculated_at: string;
}

// APIエンドポイント関数
export const raceApi = {
  // レース一覧取得
  getRaces: async (params?: { race_date?: string; venue?: string }) => {
    const response = await api.get('/races', { params });
    return response.data;
  },
  
  // レース詳細取得
  getRaceDetail: async (raceId: number) => {
    const response = await api.get(`/races/${raceId}`);
    return response.data;
  },
};

export const commentApi = {
  // コメント一覧取得
  getComments: async (params?: { race_id?: number; horse_id?: number }) => {
    const response = await api.get('/comments', { params });
    return response.data;
  },
  
  // コメント作成
  createComment: async (data: CommentData) => {
    const response = await api.post('/comments', data);
    return response.data;
  },
  
  // コメント更新
  updateComment: async (commentId: number, data: CommentUpdateData) => {
    const response = await api.put(`/comments/${commentId}`, data);
    return response.data;
  },
  
  // コメント削除
  deleteComment: async (commentId: number) => {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  },
};

export const bettingApi = {
  // 馬券購入結果一覧取得
  getBettingResults: async (params?: { race_id?: number }) => {
    const response = await api.get('/betting', { params });
    return response.data;
  },
  
  // 馬券購入結果作成
  createBettingResult: async (data: BettingResultData) => {
    const response = await api.post('/betting', data);
    return response.data;
  },
  
  // 馬券購入結果更新
  updateBettingResult: async (id: number, data: BettingResultUpdateData) => {
    const response = await api.put(`/betting/${id}`, data);
    return response.data;
  },
  
  // 馬券購入結果削除
  deleteBettingResult: async (id: number) => {
    const response = await api.delete(`/betting/${id}`);
    return response.data;
  },
};

export const statsApi = {
  // 統計情報取得
  getStats: async (params?: { category?: string; start_date?: string; end_date?: string }) => {
    const response = await api.get('/stats', { params });
    return response.data;
  },
  
  // KPI取得
  getKpi: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await api.get('/kpi', { params });
    return response.data;
  },
  
  // レコメンデーション取得
  getRecommendations: async (target_date: string) => {
    const response = await api.get('/recommendations', { params: { target_date } });
    return response.data;
  },
};

export const syncApi = {
  // データ同期
  syncData: async (target_date: string, force: boolean = false) => {
    const response = await api.post('/sync', null, { params: { target_date, force } });
    return response.data;
  },
};

export interface FeedbackData {
  name?: string;
  email?: string;
  type: string;
  title: string;
  description: string;
}

export interface FeedbackResponse {
  id: number;
  name: string | null;
  email: string | null;
  type: string;
  title: string;
  description: string;
  created_at: string;
  status: string;
}

// フィードバックAPI
export const feedbackApi = {
  // フィードバック送信
  async submitFeedback(data: FeedbackData): Promise<FeedbackResponse> {
    const response = await api.post('/feedback', data);
    return response.data;
  },
  
  // 全フィードバック取得（管理者用）
  async getAllFeedback(): Promise<FeedbackResponse[]> {
    const response = await api.get('/feedback');
    return response.data;
  }
}; 