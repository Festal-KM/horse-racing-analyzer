import { extendTheme } from '@chakra-ui/react';

// カラーパレット（screenDesign.mdから）
const colors = {
  brand: {
    primary: '#1a365d',   // 濃紺
    secondary: '#2c7a7b', // ティール
    accent: '#e53e3e',    // 赤
  },
  bg: {
    main: '#f7fafc',      // 薄灰色
  },
  text: {
    main: '#1a202c',      // 濃灰色
  }
};

// フォント設定
const fonts = {
  heading: 'Noto Sans JP, sans-serif',
  body: 'Noto Sans JP, sans-serif',
};

// その他のカスタム設定
const theme = extendTheme({
  colors,
  fonts,
  styles: {
    global: {
      body: {
        bg: 'bg.main',
        color: 'text.main',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'teal',
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: 'bold',
      },
    },
  },
});

export default theme; 