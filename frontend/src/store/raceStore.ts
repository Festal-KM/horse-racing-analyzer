'use client';

import { create } from 'zustand';
import { raceApi, syncApi } from '@/lib/api';

// 型定義
export interface Race {
  id: number;
  race_id: string;
  race_date: string;
  venue: string;
  race_number: number;
  race_name: string;
  race_class: string;
  course_type: string;
  distance: number;
  weather: string | null;
  track_condition: string | null;
  start_time: string | null;
}

export interface Horse {
  id: number;
  race_id: number;
  horse_id: string;
  horse_name: string;
  horse_number: number;
  jockey: string;
  trainer: string;
  weight: number | null;
  odds: number | null;
  result_order: number | null;
}

export interface RaceDetail {
  race: Race;
  horses: Horse[];
}

export interface SyncResult {
  status: string;
  message: string;
  details?: Array<Record<string, unknown>>;
}

interface RaceState {
  races: Race[];
  selectedRace: RaceDetail | null;
  currentDate: string;
  currentVenue: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  
  // アクション
  fetchRaces: (date?: string, venue?: string) => Promise<void>;
  fetchRaceDetail: (raceId: number) => Promise<void>;
  setCurrentVenue: (venue: string | null) => void;
  syncRaceData: (date: string, force?: boolean) => Promise<SyncResult | undefined>;
}

// 今日の日付をYYYY-MM-DD形式で取得
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const useRaceStore = create<RaceState>((set, get) => ({
  races: [],
  selectedRace: null,
  currentDate: getTodayString(),
  currentVenue: null,
  isLoading: false,
  isSyncing: false,
  error: null,
  
  fetchRaces: async (date, venue) => {
    try {
      set({ isLoading: true, error: null });
      
      const params: { race_date?: string; venue?: string } = {};
      
      // 日付が指定されていれば使用、なければ現在の日付を使用
      const targetDate = date || get().currentDate;
      params.race_date = targetDate;
      
      // 開催場が指定されていれば使用
      if (venue) {
        params.venue = venue;
      }
      
      // APIからレース一覧を取得
      const races = await raceApi.getRaces(params);
      
      set({ 
        races, 
        currentDate: targetDate, 
        isLoading: false 
      });
    } catch (error) {
      console.error('レース一覧取得エラー:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : '不明なエラーが発生しました' 
      });
    }
  },
  
  fetchRaceDetail: async (raceId) => {
    try {
      set({ isLoading: true, error: null });
      
      // APIからレース詳細を取得
      const raceDetail = await raceApi.getRaceDetail(raceId);
      
      set({ selectedRace: raceDetail, isLoading: false });
    } catch (error) {
      console.error('レース詳細取得エラー:', error);
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : '不明なエラーが発生しました'
      });
    }
  },
  
  setCurrentVenue: (venue) => {
    set({ currentVenue: venue });
  },
  
  syncRaceData: async (date, force = false) => {
    try {
      set({ isSyncing: true, error: null });
      
      // データ同期APIを呼び出し
      const result = await syncApi.syncData(date, force);
      
      // 同期成功後、同じ日付のレース一覧を再取得
      await get().fetchRaces(date);
      
      set({ isSyncing: false });
      
      return result as SyncResult;
    } catch (error) {
      console.error('データ同期エラー:', error);
      set({ 
        isSyncing: false, 
        error: error instanceof Error ? error.message : '不明なエラーが発生しました'
      });
      return undefined;
    }
  }
})); 