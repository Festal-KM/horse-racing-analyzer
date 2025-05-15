'use client';

import { Box, Flex, Heading, Button, Spacer, HStack, useToast } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const toast = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncData = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      // TODO: 実際のAPI連携実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'データ更新完了',
        description: 'レースデータが最新の状態に更新されました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      toast({
        title: 'エラー',
        description: 'データ更新中にエラーが発生しました',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <Box as="header" bg="brand.primary" color="white" py={3} px={4} boxShadow="sm">
      <Flex align="center" maxW="1200px" mx="auto">
        <Link href="/" passHref>
          <Heading as="h1" size="md" cursor="pointer">
            競馬予想ツール
          </Heading>
        </Link>

        <Spacer />

        <HStack spacing={4}>
          <Link href="/" passHref>
            <Button
              variant={isActive('/') ? 'solid' : 'ghost'}
              colorScheme="teal"
              size="sm"
            >
              レース一覧
            </Button>
          </Link>
          
          <Link href="/dashboard" passHref>
            <Button
              variant={isActive('/dashboard') ? 'solid' : 'ghost'}
              colorScheme="teal"
              size="sm"
            >
              ダッシュボード
            </Button>
          </Link>
          
          <Link href="/feedback" passHref>
            <Button
              variant={isActive('/feedback') ? 'solid' : 'ghost'}
              colorScheme="teal"
              size="sm"
            >
              フィードバック
            </Button>
          </Link>
          
          <Button
            colorScheme="red"
            size="sm"
            onClick={syncData}
            isLoading={isSyncing}
            loadingText="更新中"
          >
            🔄 最新データ取得
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
} 