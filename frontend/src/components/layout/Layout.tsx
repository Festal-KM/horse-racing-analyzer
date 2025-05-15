'use client';

import { Box, Container } from '@chakra-ui/react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Header />
      <Container maxW="1200px" flex="1" py={6} px={4}>
        {children}
      </Container>
      <Footer />
    </Box>
  );
} 