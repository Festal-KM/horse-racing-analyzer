import { screen } from '@testing-library/react';
import { render } from '../__utils__/test-utils';
import Layout from '@/components/layout/Layout';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/'),
}));

describe('Layout Component', () => {
  it('renders header and footer', () => {
    render(
      <Layout>
        <div data-testid="test-content">テストコンテンツ</div>
      </Layout>
    );
    
    // ヘッダーのロゴが表示されているか
    expect(screen.getByText('競馬予想ツール')).toBeInTheDocument();
    
    // ナビゲーションリンクが表示されているか
    expect(screen.getByText('レース一覧')).toBeInTheDocument();
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    
    // 子要素（コンテンツ）が表示されているか
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('テストコンテンツ')).toBeInTheDocument();
    
    // フッターが表示されているか
    expect(screen.getByText(/競馬予想ツール - 個人利用のみ/)).toBeInTheDocument();
    expect(screen.getByText(/最終更新:/)).toBeInTheDocument();
  });
}); 