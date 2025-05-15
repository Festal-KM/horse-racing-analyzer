const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // テスト環境のNext.jsアプリへのパスを指定
  dir: './',
});

// Jest用のカスタム設定
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // aliasの設定
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/src/__tests__/__utils__/'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
};

// createJestConfigはNextのJest設定を基に、カスタム設定を読み込んで
// 最終的なJest設定を生成します
module.exports = createJestConfig(customJestConfig); 