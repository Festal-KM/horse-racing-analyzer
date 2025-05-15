'use client';

import { useState } from 'react';
import { 
  Box, Heading, VStack, FormControl, 
  FormLabel, Input, Textarea, Button, 
  useToast, Select, Text, Card, CardBody
} from '@chakra-ui/react';
import Layout from '@/components/layout/Layout';
import { feedbackApi, FeedbackData } from '@/lib/api';

// フィードバックタイプの定義
const feedbackTypes = [
  { value: 'bug', label: '不具合報告' },
  { value: 'feature', label: '機能リクエスト' },
  { value: 'improvement', label: '改善提案' },
  { value: 'other', label: 'その他' }
];

export default function FeedbackPage() {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: '',
    title: '',
    description: ''
  });

  // 入力フィールド変更ハンドラー
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // フォーム送信ハンドラー
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 必須フィールドのバリデーション
    if (!formData.title || !formData.description || !formData.type) {
      toast({
        title: '入力エラー',
        description: '種類、タイトル、詳細は必須項目です',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // APIを使用してフィードバックを送信
      const feedbackData: FeedbackData = {
        name: formData.name || undefined,
        email: formData.email || undefined,
        type: formData.type,
        title: formData.title,
        description: formData.description
      };
      
      await feedbackApi.submitFeedback(feedbackData);
      
      // 成功トースト表示
      toast({
        title: 'フィードバックを受け付けました',
        description: 'ありがとうございます。いただいたご意見は今後の改善に活かします。',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      
      // フォームリセット
      setFormData({
        name: '',
        email: '',
        type: '',
        title: '',
        description: ''
      });
      
    } catch (error) {
      toast({
        title: '送信エラー',
        description: 'フィードバックの送信中にエラーが発生しました。しばらくしてからお試しください。',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      console.error('フィードバック送信エラー:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <Box maxW="800px" mx="auto" py={8} px={4}>
        <Heading as="h1" size="lg" mb={6}>フィードバック</Heading>
        
        <Card mb={6}>
          <CardBody>
            <Text mb={4}>
              サービス改善のため、ご意見・ご要望をお聞かせください。
              いただいたフィードバックは今後の開発に活かしてまいります。
            </Text>
          </CardBody>
        </Card>
        
        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>種類</FormLabel>
              <Select 
                name="type"
                placeholder="フィードバックの種類を選択してください"
                value={formData.type}
                onChange={handleChange}
              >
                {feedbackTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel>タイトル</FormLabel>
              <Input 
                name="title"
                placeholder="フィードバックの要点"
                value={formData.title}
                onChange={handleChange}
              />
            </FormControl>
            
            <FormControl isRequired>
              <FormLabel>詳細</FormLabel>
              <Textarea 
                name="description"
                placeholder="詳しい内容をご記入ください"
                rows={5}
                value={formData.description}
                onChange={handleChange}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>お名前</FormLabel>
              <Input 
                name="name"
                placeholder="任意"
                value={formData.name}
                onChange={handleChange}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>メールアドレス</FormLabel>
              <Input 
                name="email"
                type="email"
                placeholder="返信をご希望の場合はご記入ください（任意）"
                value={formData.email}
                onChange={handleChange}
              />
            </FormControl>
            
            <Button 
              colorScheme="teal" 
              type="submit" 
              isLoading={isSubmitting}
              loadingText="送信中..."
              mt={4}
            >
              送信する
            </Button>
          </VStack>
        </form>
      </Box>
    </Layout>
  );
} 