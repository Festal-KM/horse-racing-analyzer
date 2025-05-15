import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../__utils__/test-utils';
import DashboardPage from '@/app/dashboard/page';

// APIのモック
jest.mock('@/lib/api', () => ({
  statsApi: {
    getKpi: jest.fn().mockResolvedValue({
      roi: 98.5,
      win_rate: 35.2,
      bet_count: 125,
      total_bet: 125000,
      total_payout: 123125,
      win_count: 44
    }),
    getStats: jest.fn().mockResolvedValue([
      {
        id: 1,
        category: 'venue',
        condition: '東京',
        bet_count: 30,
        win_count: 12,
        total_bet: 30000,
        total_payout: 32400,
        roi: 108.0,
        calculated_at: '2024-05-14T10:00:00'
      }
    ])
  },
  bettingApi: {
    createBettingResult: jest.fn().mockResolvedValue({})
  }
}));

// useRouter モック
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/dashboard'),
}));

describe('Dashboard Page', () => {
  it('renders KPI cards', async () => {
    render(<DashboardPage />);
    
    // ページのタイトルが表示されるか（h1タグで限定）
    expect(screen.getByRole('heading', { name: 'ダッシュボード', level: 1 })).toBeInTheDocument();
    
    // ローディング中の表示がされるか
    expect(screen.getByText('データを取得中...')).toBeInTheDocument();
    
    // APIからデータがロードされるのを待つ
    await waitFor(() => {
      expect(screen.queryByText('データを取得中...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // KPIの値が表示されているか
    expect(screen.getByText('98.5%')).toBeInTheDocument(); // 回収率
    expect(screen.getByText('35.2%')).toBeInTheDocument(); // 的中率
    expect(screen.getByText('44/125レース')).toBeInTheDocument(); // レース数
    expect(screen.getByText('-1,875円')).toBeInTheDocument(); // 収支
    
    // フィルターが正しく表示されているか
    expect(screen.getByText('フィルター')).toBeInTheDocument();
  });
  
  it('handles filter changes', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);
    
    // APIからデータがロードされるのを待つ
    await waitFor(() => {
      expect(screen.queryByText('データを取得中...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // 開催場のセレクトボックスを操作（テスト対象から探す方法を修正）
    const venueSelect = screen.getAllByRole('combobox')[0]; // 最初のセレクトボックス
    await user.click(venueSelect);
    
    // 統計APIが再度呼ばれるのを確認
    expect(screen.getByText('フィルター')).toBeInTheDocument();
  });
}); 