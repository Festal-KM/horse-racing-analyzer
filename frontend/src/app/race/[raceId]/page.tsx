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
    isLoading: isCommentsLoading, 
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
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
    } catch (error) {
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
  const handleBettingChange = (field: string, value: any) => {
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
      
    } catch (error) {
      toast({
        title: "保存に失敗しました",
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
          <Button mt={4} colorScheme="teal" onClick={() => window.history.back()}>
            戻る
          </Button>
        </Box>
      </Layout>
    );
  }

  const { race, horses } = selectedRace;

  return (
    <Layout>
      <Grid templateColumns={{ base: "1fr", lg: "3fr 2fr" }} gap={6}>
        {/* 左カラム: レース情報と出走馬一覧 */}
        <GridItem>
          <Box mb={6}>
            <Heading as="h1" size="lg" mb={2}>{race.race_name}</Heading>
            <Text fontSize="md" mb={2}>
              {race.venue} {race.race_number}R / {race.race_date}
            </Text>
            <Box mb={4}>
              <Badge colorScheme={getCourseTypeColor(race.course_type)} mr={2}>
                {race.course_type}{race.distance}m
              </Badge>
              <Badge colorScheme="purple" mr={2}>{race.race_class}</Badge>
              {race.weather && (
                <Badge colorScheme="blue" mr={2}>{race.weather}</Badge>
              )}
              {race.track_condition && (
                <Badge colorScheme="yellow">{race.track_condition}</Badge>
              )}
            </Box>
          </Box>

          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr bg="gray.50">
                  <Th>馬番</Th>
                  <Th>馬名</Th>
                  <Th>騎手</Th>
                  <Th>調教師</Th>
                  <Th isNumeric>オッズ</Th>
                  <Th isNumeric>馬体重</Th>
                  <Th isNumeric>着順</Th>
                </Tr>
              </Thead>
              <Tbody>
                {horses.map(horse => (
                  <Tr 
                    key={horse.id} 
                    onClick={() => handleSelectHorse(horse.id)}
                    bg={selectedHorseId === horse.id ? "blue.50" : undefined}
                    _hover={{ bg: "gray.50", cursor: "pointer" }}
                  >
                    <Td fontWeight="bold">{horse.horse_number}</Td>
                    <Td>{horse.horse_name}</Td>
                    <Td>{horse.jockey}</Td>
                    <Td>{horse.trainer}</Td>
                    <Td isNumeric>{horse.odds ? horse.odds.toFixed(1) : "-"}</Td>
                    <Td isNumeric>{horse.weight || "-"}</Td>
                    <Td isNumeric>{horse.result_order || "-"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </GridItem>

        {/* 右カラム: タブ付きコンテンツ */}
        <GridItem>
          <Tabs colorScheme="teal" index={tabIndex} onChange={index => setTabIndex(index)}>
            <TabList>
              <Tab>予想メモ</Tab>
              <Tab>馬券購入</Tab>
            </TabList>
            
            <TabPanels>
              {/* 予想メモタブ */}
              <TabPanel p={0} pt={4}>
                <Card>
                  <CardBody>
                    {selectedHorseId ? (
                      <Stack spacing={4}>
                        <Box position="relative">
                          <Textarea
                            placeholder="この馬についてのコメントを入力..."
                            value={commentText}
                            onChange={handleCommentChange}
                            minHeight="150px"
                            resize="vertical"
                            isDisabled={!selectedHorseId}
                          />
                          {isSaving && (
                            <Box position="absolute" top={2} right={2}>
                              <Spinner size="sm" color="teal.500" />
                            </Box>
                          )}
                        </Box>
                        
                        <HStack justify="space-between">
                          <Button 
                            size="sm" 
                            colorScheme="teal" 
                            onClick={() => saveComment(commentText)}
                            isLoading={isSaving}
                            isDisabled={!commentText.trim()}
                          >
                            保存
                          </Button>
                          
                          {existingCommentId && (
                            <IconButton
                              aria-label="コメントを削除"
                              icon={<DeleteIcon />}
                              size="sm"
                              colorScheme="red"
                              variant="outline"
                              onClick={handleDeleteComment}
                              isDisabled={isSaving}
                            />
                          )}
                        </HStack>
                        
                        {horseComments.length > 0 && (
                          <>
                            <Divider my={2} />
                            
                            <Box>
                              <HStack justify="space-between" onClick={onToggle} cursor="pointer" mb={2}>
                                <Text fontSize="sm" fontWeight="bold">
                                  コメント履歴 ({horseComments.length})
                                </Text>
                                {isOpen ? <TriangleUpIcon /> : <TriangleDownIcon />}
                              </HStack>
                              
                              <Collapse in={isOpen} animateOpacity>
                                <Stack spacing={3} maxHeight="300px" overflowY="auto" pr={2}>
                                  {horseComments.map(comment => (
                                    <Box 
                                      key={comment.id}
                                      p={3}
                                      bg="gray.50"
                                      borderRadius="md"
                                      fontSize="sm"
                                    >
                                      <Text mb={2}>{comment.content}</Text>
                                      <HStack justify="flex-end" fontSize="xs" color="gray.500">
                                        <TimeIcon mr={1} />
                                        <Text>{formatDate(comment.updated_at)}</Text>
                                      </HStack>
                                    </Box>
                                  ))}
                                </Stack>
                              </Collapse>
                            </Box>
                          </>
                        )}
                      </Stack>
                    ) : (
                      <Box 
                        p={6} 
                        textAlign="center" 
                        borderWidth={1} 
                        borderStyle="dashed" 
                        borderColor="gray.200"
                        borderRadius="md"
                      >
                        <Text color="gray.500">左の出走馬一覧から馬を選択してください</Text>
                      </Box>
                    )}
                  </CardBody>
                </Card>
              </TabPanel>
              
              {/* 馬券購入タブ */}
              <TabPanel p={0} pt={4}>
                <Card>
                  <CardHeader pb={2}>
                    <Heading size="md">馬券購入情報</Heading>
                    <Text fontSize="sm" color="gray.500" mt={1}>
                      購入した馬券の情報を記録できます
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <Stack spacing={4}>
                      <FormControl>
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
                      
                      <FormControl>
                        <FormLabel fontSize="sm">
                          馬番
                          <Text as="span" fontSize="xs" color="gray.500" ml={2}>
                            （馬連・ワイドは「1-2」、三連複は「1-2-3」の形式）
                          </Text>
                        </FormLabel>
                        <Input 
                          value={bettingForm.betNumbers}
                          onChange={(e) => handleBettingChange('betNumbers', e.target.value)}
                          placeholder="例: 1 または 1-3"
                        />
                      </FormControl>
                      
                      <FormControl>
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
                      
                      <FormControl>
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
                        <FormControl>
                          <FormLabel fontSize="sm">払戻金額</FormLabel>
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
                        colorScheme="teal"
                        leftIcon={<AddIcon />}
                        onClick={saveBettingResult}
                        isLoading={isBettingSaving}
                        mt={2}
                      >
                        登録
                      </Button>
                    </Stack>
                  </CardBody>
                </Card>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </GridItem>
      </Grid>
    </Layout>
  );
} 