'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Box, Heading, Grid, GridItem, 
  Table, Thead, Tbody, Tr, Th, Td, 
  Text, Badge, Spinner, Button,
  Textarea, Card, CardHeader, CardBody,
  useToast, Stack, HStack, IconButton,
  Divider, useDisclosure, Collapse,
  TabList, TabPanels, TabPanel, Tabs, Tab, 
  FormControl, FormLabel, Input, Select,
  NumberInput, NumberInputField, NumberInputStepper, 
  NumberIncrementStepper, NumberDecrementStepper
} from '@chakra-ui/react';
import { DeleteIcon, TimeIcon, TriangleDownIcon, TriangleUpIcon, AddIcon } from '@chakra-ui/icons';
import { useParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useRaceStore } from '@/store/raceStore';
import { useCommentStore, CommentCreate } from '@/store/commentStore';
import { bettingApi, BettingResultData } from '@/lib/api';

// デバウンス関数
const debounce = <F extends (...args: string[]) => void>(
  func: F,
  wait: number
): ((...args: Parameters<F>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<F>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function RaceDetailPage() {
  const params = useParams();
  const raceId = Number(params.raceId);
  const toast = useToast();
  
  const { selectedRace, isLoading: isRaceLoading, fetchRaceDetail } = useRaceStore();
  const { 
    comments, 
    fetchComments, 
    createComment,
    updateComment,
    deleteComment
  } = useCommentStore();
  
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [existingCommentId, setExistingCommentId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
  
  // 馬券情報
  const [bettingForm, setBettingForm] = useState({
    betType: '単勝',
    betNumbers: '',
    amount: 100,
    isWon: false,
    payout: 0
  });
  const [isBettingSaving, setIsBettingSaving] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  
  // 初回マウント時にレース詳細とコメントを取得
  useEffect(() => {
    if (raceId) {
      fetchRaceDetail(raceId);
      fetchComments(raceId);
    }
  }, [raceId, fetchRaceDetail, fetchComments]);

  // 馬選択時の処理
  const handleSelectHorse = (horseId: number) => {
    setSelectedHorseId(horseId);
    
    // 選択された馬の既存コメントを検索
    const existingComment = comments.find(c => c.horse_id === horseId);
    
    if (existingComment) {
      setCommentText(existingComment.content);
      setExistingCommentId(existingComment.id);
    } else {
      setCommentText('');
      setExistingCommentId(null);
    }
  };

  // コメント入力時の処理
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCommentText(newText);
    
    // デバウンスを使ってコメント保存
    debouncedSaveComment(newText);
  };

  // コメント保存処理 (デバウンス用)
  const saveComment = async (text: string) => {
    if (!selectedHorseId || !raceId || isSaving) return;
    
    try {
      setIsSaving(true);
      
      if (existingCommentId) {
        // 既存コメント更新
        await updateComment(existingCommentId, { content: text });
      } else if (text.trim()) {
        // 新規コメント作成
        const data: CommentCreate = {
          race_id: raceId,
          horse_id: selectedHorseId,
          content: text
        };
        
        const newComment = await createComment(data);
        if (newComment) {
          setExistingCommentId(newComment.id);
        }
      }
      
      // 保存成功メッセージ (頻繁に表示されるとうるさいので控えめにする)
      toast({
        title: "コメントを保存しました",
        status: "success",
        duration: 1000,
        isClosable: true,
        position: "bottom-right"
      });
    } catch (saveError) {
      toast({
        title: "保存に失敗しました",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsSaving(false);
    }
  };

  // コメント削除処理
  const handleDeleteComment = useCallback(async () => {
    if (!existingCommentId) return;
    
    try {
      const success = await deleteComment(existingCommentId);
      if (success) {
        setCommentText('');
        setExistingCommentId(null);
        
        toast({
          title: "コメントを削除しました",
          status: "info",
          duration: 3000,
          isClosable: true
        });
      }
    } catch (deleteError) {
      toast({
        title: "削除に失敗しました",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    }
  }, [existingCommentId, deleteComment, toast]);

  // デバウンス処理（2秒）
  const debouncedSaveComment = debounce(saveComment, 2000);

  // 選択中の馬の過去コメント一覧を取得
  const horseComments = comments
    .filter(c => c.horse_id === selectedHorseId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // コース種別によってバッジの色を返す
  const getCourseTypeColor = (courseType: string) => {
    return courseType?.includes('芝') ? 'green' : 'orange';
  };

  // 日付フォーマット用関数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 馬券情報の入力制御
  const handleBettingChange = (field: string, value: string | number | boolean) => {
    setBettingForm(prev => ({ ...prev, [field]: value }));
  };
  
  // 馬券情報保存
  const saveBettingResult = async () => {
    if (!raceId || isBettingSaving) return;
    
    try {
      setIsBettingSaving(true);
      
      // 馬番チェック
      if (!bettingForm.betNumbers.trim()) {
        toast({
          title: "馬番を入力してください",
          status: "error",
          duration: 3000,
          isClosable: true
        });
        return;
      }
      
      // 馬券データ作成
      const data: BettingResultData = {
        race_id: raceId,
        bet_type: bettingForm.betType,
        bet_numbers: bettingForm.betNumbers,
        amount: bettingForm.amount,
        is_won: bettingForm.isWon,
        payout: bettingForm.isWon ? bettingForm.payout : 0
      };
      
      await bettingApi.createBettingResult(data);
      
      toast({
        title: "馬券情報を保存しました",
        status: "success",
        duration: 3000,
        isClosable: true
      });
      
      // フォームリセット
      setBettingForm({
        betType: '単勝',
        betNumbers: '',
        amount: 100,
        isWon: false,
        payout: 0
      });
      
    } catch (bettingError) {
      toast({
        title: "馬券情報の保存に失敗しました",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsBettingSaving(false);
    }
  };

  if (isRaceLoading) {
    return (
      <Layout>
        <Box textAlign="center" py={10}>
          <Spinner size="xl" color="brand.primary" />
          <Text mt={4}>レース情報を取得中...</Text>
        </Box>
      </Layout>
    );
  }

  if (!selectedRace) {
    return (
      <Layout>
        <Box textAlign="center" py={10}>
          <Text>レース情報が見つかりませんでした</Text>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Grid templateColumns={{ base: "1fr", lg: "3fr 2fr" }} gap={6}>
        {/* 左カラム: レース情報と出走馬一覧 */}
        <GridItem>
          <Box mb={6}>
            <Heading as="h1" size="lg" mb={2}>
              {selectedRace.race.race_name}
            </Heading>
            
            <HStack spacing={2} mb={2}>
              <Badge colorScheme="blue">{selectedRace.race.venue}</Badge>
              <Badge colorScheme={getCourseTypeColor(selectedRace.race.course_type)}>
                {selectedRace.race.course_type}{selectedRace.race.distance}m
              </Badge>
              <Badge colorScheme="purple">{selectedRace.race.race_class}</Badge>
              {selectedRace.race.weather && (
                <Badge colorScheme="cyan">{selectedRace.race.weather}</Badge>
              )}
              {selectedRace.race.track_condition && (
                <Badge colorScheme="yellow">{selectedRace.race.track_condition}</Badge>
              )}
            </HStack>
            
            <Text fontSize="sm" color="gray.600">
              {new Date(selectedRace.race.race_date).toLocaleDateString('ja-JP')} / 
              {selectedRace.race.start_time && ` 発走 ${new Date(selectedRace.race.start_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`}
            </Text>
          </Box>
          
          <HStack mb={4} justify="space-between">
            <Heading as="h2" size="md">出走馬</Heading>
            <Button size="sm" onClick={onToggle} leftIcon={isOpen ? <TriangleUpIcon /> : <TriangleDownIcon />}>
              {isOpen ? '折りたたむ' : '展開する'}
            </Button>
          </HStack>
          
          <Collapse in={isOpen} animateOpacity>
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>馬番</Th>
                    <Th>馬名</Th>
                    <Th>騎手</Th>
                    <Th>調教師</Th>
                    <Th isNumeric>単勝</Th>
                    <Th isNumeric>馬体重</Th>
                    <Th isNumeric>着順</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {selectedRace.horses.map(horse => (
                    <Tr 
                      key={horse.id} 
                      onClick={() => handleSelectHorse(horse.id)}
                      cursor="pointer"
                      bg={selectedHorseId === horse.id ? 'blue.50' : undefined}
                      _hover={{ bg: 'gray.50' }}
                    >
                      <Td>{horse.horse_number}</Td>
                      <Td fontWeight={selectedHorseId === horse.id ? 'bold' : 'normal'}>
                        {horse.horse_name}
                      </Td>
                      <Td>{horse.jockey}</Td>
                      <Td>{horse.trainer}</Td>
                      <Td isNumeric>{horse.odds}</Td>
                      <Td isNumeric>{horse.weight}</Td>
                      <Td isNumeric>{horse.result_order || '-'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Collapse>
        </GridItem>
        
        {/* 右カラム: コメント/馬券情報 */}
        <GridItem>
          <Tabs variant="enclosed" colorScheme="teal" index={tabIndex} onChange={setTabIndex}>
            <TabList>
              <Tab>コメント</Tab>
              <Tab>馬券情報</Tab>
            </TabList>
            
            <TabPanels>
              {/* コメントタブ */}
              <TabPanel>
                {selectedHorseId ? (
                  <Box>
                    <HStack mb={2} justify="space-between">
                      <Text fontWeight="bold">
                        {selectedRace.horses.find(h => h.id === selectedHorseId)?.horse_name}
                      </Text>
                      
                      {existingCommentId && (
                        <IconButton
                          aria-label="コメントを削除"
                          icon={<DeleteIcon />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={handleDeleteComment}
                        />
                      )}
                    </HStack>
                    
                    <Textarea
                      value={commentText}
                      onChange={handleCommentChange}
                      placeholder="この馬についてのコメントを入力..."
                      size="md"
                      rows={6}
                      mb={3}
                    />
                    
                    <Divider my={4} />
                    
                    <Box>
                      <HStack mb={2}>
                        <TimeIcon />
                        <Text fontSize="sm" fontWeight="bold">過去のコメント履歴</Text>
                      </HStack>
                      
                      {horseComments.length > 0 ? (
                        <Stack spacing={3}>
                          {horseComments.map(comment => (
                            <Card key={comment.id} size="sm">
                              <CardHeader pb={1}>
                                <Text fontSize="xs" color="gray.500">
                                  {formatDate(comment.updated_at)}
                                </Text>
                              </CardHeader>
                              <CardBody pt={1}>
                                <Text fontSize="sm" whiteSpace="pre-line">
                                  {comment.content}
                                </Text>
                              </CardBody>
                            </Card>
                          ))}
                        </Stack>
                      ) : (
                        <Text fontSize="sm" color="gray.500">履歴はありません</Text>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Box textAlign="center" py={8}>
                    <Text mb={4}>左の表から馬を選択してください</Text>
                  </Box>
                )}
              </TabPanel>
              
              {/* 馬券情報タブ */}
              <TabPanel>
                <Box>
                  <HStack mb={4} justify="space-between" align="center">
                    <Heading as="h3" size="sm">馬券購入記録</Heading>
                    <IconButton
                      aria-label="馬券情報を登録"
                      icon={<AddIcon />}
                      size="sm"
                      colorScheme="teal"
                    />
                  </HStack>
                  
                  <FormControl mb={3}>
                    <FormLabel fontSize="sm">馬券種類</FormLabel>
                    <Select 
                      value={bettingForm.betType}
                      onChange={(e) => handleBettingChange('betType', e.target.value)}
                    >
                      <option value="単勝">単勝</option>
                      <option value="複勝">複勝</option>
                      <option value="枠連">枠連</option>
                      <option value="馬連">馬連</option>
                      <option value="馬単">馬単</option>
                      <option value="ワイド">ワイド</option>
                      <option value="三連複">三連複</option>
                      <option value="三連単">三連単</option>
                    </Select>
                  </FormControl>
                  
                  <FormControl mb={3}>
                    <FormLabel fontSize="sm">馬番</FormLabel>
                    <Input 
                      placeholder="例: 1-3-5" 
                      value={bettingForm.betNumbers}
                      onChange={(e) => handleBettingChange('betNumbers', e.target.value)}
                    />
                  </FormControl>
                  
                  <FormControl mb={3}>
                    <FormLabel fontSize="sm">購入金額</FormLabel>
                    <NumberInput 
                      value={bettingForm.amount}
                      onChange={(_, value) => handleBettingChange('amount', value)}
                      min={100} 
                      step={100}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  
                  <FormControl mb={3}>
                    <FormLabel fontSize="sm">的中</FormLabel>
                    <Select 
                      value={bettingForm.isWon ? "true" : "false"}
                      onChange={(e) => handleBettingChange('isWon', e.target.value === "true")}
                    >
                      <option value="false">不的中</option>
                      <option value="true">的中</option>
                    </Select>
                  </FormControl>
                  
                  {bettingForm.isWon && (
                    <FormControl mb={3}>
                      <FormLabel fontSize="sm">払戻金</FormLabel>
                      <NumberInput 
                        value={bettingForm.payout}
                        onChange={(_, value) => handleBettingChange('payout', value)}
                        min={0} 
                        step={100}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>
                  )}
                  
                  <Button
                    mt={4}
                    colorScheme="teal"
                    isLoading={isBettingSaving}
                    onClick={saveBettingResult}
                    width="full"
                  >
                    馬券情報を登録
                  </Button>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </GridItem>
      </Grid>
    </Layout>
  );
} 