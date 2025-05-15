'use client';

import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { CacheProvider } from '@chakra-ui/next-js';

// テーマ拡張
const theme = extendTheme({
  colors: {
    brand: {
      primary: '#1a365d',
      secondary: '#2c7a7b',
      accent: '#e53e3e',
      bg: '#f7fafc',
      text: '#1a202c',
    },
  },
  fonts: {
    heading: `'Noto Sans JP', sans-serif`,
    body: `'Noto Sans JP', sans-serif`,
  },
  styles: {
    global: {
      body: {
        bg: 'brand.bg',
        color: 'brand.text',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'teal',
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        {children}
      </ChakraProvider>
    </CacheProvider>
  );
} 