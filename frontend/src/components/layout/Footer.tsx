'use client';

import { Box, Text, Center } from '@chakra-ui/react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const lastUpdated = new Date().toLocaleString('ja-JP');
  
  return (
    <Box as="footer" bg="brand.primary" color="white" py={4} px={4}>
      <Center flexDirection="column">
        <Text fontSize="sm">
          &copy; {currentYear} 競馬予想ツール - 個人利用のみ
        </Text>
        <Text fontSize="xs" mt={1}>
          最終更新: {lastUpdated}
        </Text>
      </Center>
    </Box>
  );
} 