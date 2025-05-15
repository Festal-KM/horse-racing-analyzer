import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import '@testing-library/jest-dom';

// ChakraUIのテーマ
const theme = {
  colors: {
    brand: {
      primary: '#1a365d',
      secondary: '#2c7a7b',
      accent: '#e53e3e',
    }
  }
};

// プロバイダーのラッパー
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ChakraProvider theme={theme}>
      {children}
    </ChakraProvider>
  );
};

// カスタムレンダー関数
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllProviders, ...options });

// テスト用のモックデータを作成するヘルパー関数
const createMockRace = (overrides = {}) => ({
  id: 1,
  race_name: "テストレース",
  race_date: "2024-05-14",
  venue: "東京",
  race_number: 1,
  course_type: "芝",
  distance: 1200,
  race_class: "G1",
  weather: "晴",
  track_condition: "良",
  ...overrides
});

const createMockHorse = (overrides = {}) => ({
  id: 1,
  race_id: 1,
  horse_number: 1,
  horse_name: "テスト馬",
  jockey: "テスト騎手",
  trainer: "テスト調教師",
  odds: 3.5,
  weight: 480,
  result_order: null,
  ...overrides
});

const createMockComment = (overrides = {}) => ({
  id: 1,
  race_id: 1,
  horse_id: 1,
  content: "テストコメント",
  is_public: true,
  created_at: "2024-05-14T10:00:00",
  updated_at: "2024-05-14T10:00:00",
  ...overrides
});

// テスト用APIレスポンスモック
const mockApiResponse = {
  data: { message: 'Success' },
  status: 200,
};

// re-export testing-libraryのユーティリティ
export * from '@testing-library/react';
export { customRender as render };
export { createMockRace, createMockHorse, createMockComment, mockApiResponse }; 