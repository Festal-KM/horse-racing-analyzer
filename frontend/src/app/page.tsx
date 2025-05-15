'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Heading, Tabs, TabList, Tab, 
  TabPanels, TabPanel, SimpleGrid, 
  Card, CardHeader, CardBody, 
  Text, Badge, Spinner, 
  Input, HStack, VStack, Button,
  useToast, IconButton, Tooltip
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useRaceStore } from '@/store/raceStore';

// 開催場リスト
const venues = [
  '全場', '東京', '中山', '阪神', '京都', '中京', '小倉', '福島', '新潟', '札幌', '函館'
];

export default function HomePage() {
  const router = useRouter();
  const toast = useToast();
  const { 
    races, 
    currentDate, 
    currentVenue, 
    isLoading, 
    isSyncing,
    fetchRaces, 
    setCurrentVenue,
    syncRaceData 
  } = useRaceStore();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [venueTabIndex, setVenueTabIndex] = useState(0);

  // 初回レンダリング時にレース一覧を取得
  useEffect(() => {
    fetchRaces(selectedDate);
  }, [fetchRaces, selectedDate]);

  // 日付変更時の処理
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    fetchRaces(newDate, currentVenue || undefined);
  };

  // 開催場タブ変更時の処理
  const handleVenueChange = (index: number) => {
    setVenueTabIndex(index);
    const newVenue = index === 0 ? null : venues[index];
    setCurrentVenue(newVenue);
    fetchRaces(selectedDate, newVenue || undefined);
  };

  // レースカードクリック時の処理
  const handleRaceClick = (raceId: number) => {
    router.push(`/race/${raceId}`);
  };

  // データ同期処理
  const handleSyncData = async () => {
    try {
      const result = await syncRaceData(selectedDate, false);
      
      if (result?.status === 'success') {
        toast({
          title: '同期完了',
          description: result.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else if (result?.status === 'skipped') {
        toast({
          title: '同期スキップ',
          description: result.message,
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      } else if (result?.status === 'no_data') {
        toast({
          title: 'データなし',
          description: result.message,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: '一部エラー',
          description: '一部のデータの同期に失敗しました',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (syncError) {
      toast({
        title: '同期エラー',
        description: 'データの同期中にエラーが発生しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // コース種別によってバッジの色を返す
  const getCourseTypeColor = (courseType: string) => {
    return courseType.includes('芝') ? 'green' : 'orange';
  };

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading as="h1" size="lg" mb={4}>レース一覧</Heading>
          
          <HStack spacing={4} mb={4} justify="space-between">
            <HStack spacing={4}>
              <Box>
                <Text fontSize="sm" mb={1}>日付</Text>
                <Input 
                  type="date" 
                  value={selectedDate} 
                  onChange={handleDateChange}
                  size="md"
                  width="180px"
                />
              </Box>
            </HStack>
            
            <Tooltip label="JRAからデータを同期" hasArrow>
              <IconButton
                aria-label="データを同期"
                icon={<RepeatIcon />}
                colorScheme="teal"
                isLoading={isSyncing}
                onClick={handleSyncData}
                size="md"
              />
            </Tooltip>
          </HStack>
        </Box>

        <Tabs 
          variant="enclosed" 
          colorScheme="teal"
          index={venueTabIndex} 
          onChange={handleVenueChange}
        >
          <TabList>
            {venues.map((venue) => (
              <Tab key={venue}>{venue}</Tab>
            ))}
          </TabList>

          <TabPanels>
            {venues.map((venue) => (
              <TabPanel key={venue} pt={6}>
                {isLoading ? (
                  <Box textAlign="center" py={10}>
                    <Spinner size="xl" color="brand.primary" />
                    <Text mt={4}>レース情報を取得中...</Text>
                  </Box>
                ) : races.length === 0 ? (
                  <Box textAlign="center" py={10}>
                    <Text>レースが見つかりませんでした</Text>
                    <Button 
                      mt={4} 
                      leftIcon={<RepeatIcon />} 
                      colorScheme="teal" 
                      onClick={handleSyncData}
                      isLoading={isSyncing}
                    >
                      JRAからデータを取得
                    </Button>
                  </Box>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                    {races.map(race => (
                      <Card 
                        key={race.id} 
                        cursor="pointer" 
                        onClick={() => handleRaceClick(race.id)}
                        _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
                        transition="all 0.2s"
                      >
                        <CardHeader pb={2}>
                          <Text fontSize="lg" fontWeight="bold">
                            {race.race_number}R {race.race_name}
                          </Text>
                          <HStack mt={1}>
                            <Badge colorScheme={getCourseTypeColor(race.course_type)}>
                              {race.course_type}{race.distance}m
                            </Badge>
                            <Badge colorScheme="purple">{race.race_class}</Badge>
                            {race.weather && (
                              <Badge colorScheme="blue">{race.weather}</Badge>
                            )}
                          </HStack>
                        </CardHeader>
                        <CardBody pt={0}>
                          <Text fontSize="sm" color="gray.600">
                            {race.venue} / 発走 {race.start_time ? new Date(race.start_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '未定'}
                          </Text>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </VStack>
    </Layout>
  );
}
