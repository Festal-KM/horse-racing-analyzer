import { render, screen } from '@testing-library/react';
import Layout from '@/components/layout/Layout';

// 単純なレース詳細画面のモックテスト
describe('Race Layout Component', () => {
  it('renders layout correctly', () => {
    render(
      <Layout>
        <div data-testid="race-content">レース詳細コンテンツ</div>
      </Layout>
    );
    
    // レイアウトが正しく表示されているか
    expect(screen.getByText('競馬予想ツール')).toBeInTheDocument();
    expect(screen.getByTestId('race-content')).toBeInTheDocument();
    expect(screen.getByText('レース詳細コンテンツ')).toBeInTheDocument();
    expect(screen.getByText(/競馬予想ツール - 個人利用のみ/)).toBeInTheDocument();
  });
}); 