'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Box, Heading, SimpleGrid, 
  Card, CardHeader, CardBody, 
  Stat, StatLabel, StatNumber, StatHelpText, 
  Text, Spinner, Select,
  FormControl, FormLabel, Input,
  Table, Thead, Tbody, Tr, Th, Td,
  Button, VStack
} from '@chakra-ui/react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import Layout from '@/components/layout/Layout';
import { statsApi, bettingApi, StatsData } from '@/lib/api';

interface KPI {
  roi: number;
  win_rate: number;
  bet_count: number;
  total_bet: number;
  total_payout: number;
  win_count: number;
}

interface FilterState {
  startDate: string;
  endDate: string;
  venue: string;
  courseType: string;
  raceClass: string;
}

interface ApiParams {
  start_date?: string;
  end_date?: string;
  category?: string;
}

// サンプル回収率推移データ
const generateSampleData = () => {
  return Array.from({ length: 12 }, (_, i) => {
    // 80%〜120%の間のランダムな回収率
    const roi = Math.floor(80 + Math.random() * 40);
    return {
      month: `${i + 1}月`,
      roi: roi,
      color: roi >= 100 ? '#38A169' : '#E53E3E',
    };
  });
};

// カテゴリ別の色
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'venue': '#3182CE',
    'course_type': '#38A169',
    'race_class': '#D69E2E',
    'other': '#718096'
  };
  
  return colors[category] || colors.other;
};

export default function DashboardPage() {
  const [kpi, setKPI] = useState<KPI | null>(null);
  const [stats, setStats] = useState<StatsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // フィルター状態
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    venue: '',
    courseType: '',
    raceClass: ''
  });
  
  // サンプルデータ（後で実データに置き換え）
  const monthlyData = useMemo(() => generateSampleData(), []);
  
  // KPIデータ取得
  useEffect(() => {
    fetchKPI();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);
  
  const fetchKPI = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params: ApiParams = {};
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      
      const data = await statsApi.getKpi(params);
      setKPI(data);
    } catch (error) {
      console.error('KPI取得エラー:', error);
      setError('データ取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchStats = async () => {
    try {
      setIsStatsLoading(true);
      
      const params: ApiParams = {};
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      
      // 開催場統計取得
      if (filters.venue) {
        params.category = 'venue';
      }
      
      // 統計データ取得
      const data = await statsApi.getStats(params);
      setStats(data);
    } catch (error) {
      console.error('統計データ取得エラー:', error);
    } finally {
      setIsStatsLoading(false);
    }
  };
  
  // フィルター変更ハンドラー
  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  // カテゴリでグループ化した統計データ
  const groupedStats = useMemo(() => {
    const grouped: Record<string, StatsData[]> = {};
    
    stats.forEach(stat => {
      if (!grouped[stat.category]) {
        grouped[stat.category] = [];
      }
      grouped[stat.category].push(stat);
    });
    
    return grouped;
  }, [stats]);
  
  // 条件別回収率グラフ用データ
  const categoryROIData = useMemo(() => {
    return Object.entries(groupedStats).map(([category, data]) => {
      // 各カテゴリから上位5件を抽出
      const topItems = [...data]
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 5);
      
      return {
        category,
        items: topItems.map(item => ({
          name: item.condition,
          roi: parseFloat(item.roi.toFixed(1)),
          fill: getCategoryColor(category)
        }))
      };
    });
  }, [groupedStats]);
  
  // ダミー馬券データを作成する関数（本番では削除）
  const createDummyBettingData = async () => {
    try {
      // 適当なレースIDを使用（実際には存在するレースIDを使用）
      const raceId = 1;
      
      // ダミーデータ作成
      const dummyData = [
        {
          race_id: raceId,
          bet_type: '単勝',
          bet_numbers: '1',
          amount: 1000,
          is_won: true,
          payout: 1500
        },
        {
          race_id: raceId,
          bet_type: '複勝',
          bet_numbers: '2',
          amount: 1000,
          is_won: true,
          payout: 1200
        },
        {
          race_id: raceId,
          bet_type: '馬連',
          bet_numbers: '1-3',
          amount: 1000,
          is_won: false,
          payout: 0
        }
      ];
      
      // 順次API呼び出し
      for (const data of dummyData) {
        await bettingApi.createBettingResult(data);
      }
      
      // データ再取得
      await fetchKPI();
      await fetchStats();
      
      alert('テスト用馬券データを作成しました');
    } catch (error) {
      console.error('ダミーデータ作成エラー:', error);
      alert('テストデータ作成に失敗しました');
    }
  };
  
  return (
    <Layout>
      <Box mb={6}>
        <Heading as="h1" size="lg" mb={4}>ダッシュボード</Heading>
        
        {/* フィルターパネル */}
        <Card mb={6}>
          <CardHeader pb={2}>
            <Heading size="md">フィルター</Heading>
          </CardHeader>
          <CardBody pt={2}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">開始日</FormLabel>
                <Input 
                  type="date" 
                  value={filters.startDate} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('startDate', e.target.value)}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel fontSize="sm">終了日</FormLabel>
                <Input 
                  type="date" 
                  value={filters.endDate} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('endDate', e.target.value)}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel fontSize="sm">開催場</FormLabel>
                <Select 
                  placeholder="全て" 
                  value={filters.venue}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('venue', e.target.value)}
                >
                  <option value="東京">東京</option>
                  <option value="中山">中山</option>
                  <option value="阪神">阪神</option>
                  <option value="京都">京都</option>
                  <option value="中京">中京</option>
                  <option value="小倉">小倉</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel fontSize="sm">コース</FormLabel>
                <Select 
                  placeholder="全て" 
                  value={filters.courseType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('courseType', e.target.value)}
                >
                  <option value="芝">芝</option>
                  <option value="ダート">ダート</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel fontSize="sm">クラス</FormLabel>
                <Select 
                  placeholder="全て" 
                  value={filters.raceClass}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('raceClass', e.target.value)}
                >
                  <option value="G1">G1</option>
                  <option value="G2">G2</option>
                  <option value="G3">G3</option>
                  <option value="オープン">オープン</option>
                  <option value="3勝">3勝クラス</option>
                  <option value="2勝">2勝クラス</option>
                  <option value="1勝">1勝クラス</option>
                </Select>
              </FormControl>
            </SimpleGrid>
          </CardBody>
        </Card>
        
        {/* KPIカード */}
        {isLoading ? (
          <Box textAlign="center" py={10}>
            <Spinner size="xl" color="brand.primary" />
            <Text mt={4}>データを取得中...</Text>
          </Box>
        ) : error ? (
          <Box textAlign="center" py={10}>
            <Text color="red.500">{error}</Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={8}>
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>回収率</StatLabel>
                  <StatNumber>{kpi?.roi.toFixed(1)}%</StatNumber>
                  <StatHelpText color={kpi && kpi.roi >= 100 ? 'green.500' : 'red.500'}>
                    {kpi && kpi.roi >= 100 ? '黒字' : '赤字'}
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>的中率</StatLabel>
                  <StatNumber>{kpi?.win_rate.toFixed(1)}%</StatNumber>
                  <StatHelpText>
                    {kpi && `${kpi.win_count}/${kpi.bet_count}レース`}
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody>
                <Stat>
                  <StatLabel>収支</StatLabel>
                  <StatNumber color={(kpi && (kpi.total_payout - kpi.total_bet) >= 0) ? 'green.500' : 'red.500'}>
                    {kpi && new Intl.NumberFormat('ja-JP').format((kpi.total_payout - kpi.total_bet) || 0)}円
                  </StatNumber>
                  <StatHelpText>
                    投資: {kpi && new Intl.NumberFormat('ja-JP').format(kpi.total_bet || 0)}円
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>
        )}
        
        {/* グラフセクション */}
        <VStack spacing={8} align="stretch">
          {/* 回収率推移グラフ */}
          <Card>
            <CardHeader>
              <Heading size="md">回収率推移</Heading>
            </CardHeader>
            <CardBody>
              {isStatsLoading ? (
                <Box textAlign="center" py={4}>
                  <Spinner />
                </Box>
              ) : (
                <Box height="300px">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 'dataMax + 20']} />
                      <RechartsTooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="roi" 
                        name="回収率 (%)" 
                        stroke="#2C7A7B" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      {/* 回収率100%ライン */}
                      <Line 
                        type="monotone" 
                        dataKey={() => 100} 
                        name="収支トントン" 
                        stroke="#718096" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardBody>
          </Card>
          
          {/* 条件別回収率グラフ */}
          {categoryROIData.length > 0 && (
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              {categoryROIData.map(category => (
                <Card key={category.category}>
                  <CardHeader>
                    <Heading size="md">
                      {(() => {
                        switch(category.category) {
                          case 'venue': return '開催場別回収率';
                          case 'course_type': return 'コース別回収率';
                          case 'race_class': return 'クラス別回収率';
                          default: return `${category.category}別回収率`;
                        }
                      })()}
                    </Heading>
                  </CardHeader>
                  <CardBody>
                    <Box height="250px">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={category.items}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 'dataMax + 20']} />
                          <RechartsTooltip />
                          <Legend />
                          <Bar 
                            dataKey="roi" 
                            name="回収率 (%)" 
                            fill={getCategoryColor(category.category)}
                          />
                          {/* 回収率100%ライン */}
                          <RechartsTooltip formatter={(value) => [`${value}%`, '回収率']} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          )}
          
          {/* テスト用: ダミーデータ作成ボタン */}
          <Box textAlign="center" py={4}>
            <Button onClick={createDummyBettingData} colorScheme="teal" size="sm">
              テスト用馬券データを作成
            </Button>
          </Box>
          
          {/* 統計データ一覧表 */}
          {stats.length > 0 && (
            <Card>
              <CardHeader>
                <Heading size="md">条件別成績</Heading>
              </CardHeader>
              <CardBody overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>カテゴリ</Th>
                      <Th>条件</Th>
                      <Th isNumeric>回収率</Th>
                      <Th isNumeric>的中率</Th>
                      <Th isNumeric>投票数</Th>
                      <Th isNumeric>投資額</Th>
                      <Th isNumeric>払戻額</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {stats.slice(0, 10).map(stat => (
                      <Tr key={stat.id}>
                        <Td>
                          {(() => {
                            switch(stat.category) {
                              case 'venue': return '開催場';
                              case 'course_type': return 'コース';
                              case 'race_class': return 'クラス';
                              default: return stat.category;
                            }
                          })()}
                        </Td>
                        <Td>{stat.condition}</Td>
                        <Td isNumeric color={stat.roi >= 100 ? 'green.500' : 'red.500'}>
                          {stat.roi.toFixed(1)}%
                        </Td>
                        <Td isNumeric>
                          {((stat.win_count / stat.bet_count) * 100).toFixed(1)}%
                        </Td>
                        <Td isNumeric>{stat.bet_count}</Td>
                        <Td isNumeric>{new Intl.NumberFormat('ja-JP').format(stat.total_bet)}円</Td>
                        <Td isNumeric>{new Intl.NumberFormat('ja-JP').format(stat.total_payout)}円</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </CardBody>
            </Card>
          )}
        </VStack>
      </Box>
    </Layout>
  );
} 