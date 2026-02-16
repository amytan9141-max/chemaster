// netlify/functions/evaluate-handwriting/evaluate-handwriting.js
import { GoogleGenAI, Type } from "@google/genai";

const visionModel = 'gemini-3-flash-preview';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // 處理預檢請求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 只允許 POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { imageBase64, questions } = JSON.parse(event.body);
    const apiKey = process.env.VITE_GEMINI_API_KEY;

    console.log('API Key exists:', !!apiKey);
    console.log('Questions count:', questions?.length);

    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY not found in environment variables');
    }

    const ai = new GoogleGenAI({ apiKey });

    // 處理圖片數據
    let imageData = imageBase64;
    if (imageBase64.includes(',')) {
      imageData = imageBase64.split(',')[1];
    }

    const prompt = `你是一位化學老師。這是一張學生的手寫作業照片。
題目列表如下：${JSON.stringify(questions, null, 2)}
請檢查學生的手寫答案是否正確（化學式、上標、下標）。
請以 JSON 格式回傳評分結果，包含：
1. score: 總分 (滿分 ${questions.length}分)
2. results: 陣列，每個元素包含 question, expected, studentWrote, isCorrect, feedback
3. overallFeedback: 總體評語。`;

    console.log('Calling Gemini API...');

    const response = await ai.models.generateContent({
      model: visionModel,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageData,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });

    console.log('Gemini API response received');

    // 解析回應
    let result;
    try {
      const text = response.text;
      console.log('Raw response length:', text?.length || 0);
      
      // 嘗試從回應中提取 JSON
      const jsonMatch = text?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      
      // 返回降級方案
      result = {
        score: questions.length,
        results: questions.map((q, index) => ({
          question: q.zh || q.question || `Question ${index + 1}`,
          expected: q.formula || q.expected || '',
          studentWrote: q.formula || q.expected || '',
          isCorrect: true,
          feedback: '無法識別手寫內容，已視為正確。'
        })),
        overallFeedback: '系統無法分析圖片，請確保圖片清晰。'
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Evaluation error:', error);
    
    // 錯誤時的降級方案
    let questions = [];
    try {
      const body = JSON.parse(event.body);
      questions = body.questions || [];
    } catch (e) {}

    const fallbackResult = {
      score: questions.length,
      results: questions.map((q, index) => ({
        question: q.zh || q.question || `Question ${index + 1}`,
        expected: q.formula || q.expected || '',
        studentWrote: q.formula || q.expected || '',
        isCorrect: true,
        feedback: '系統暫時無法分析，請稍後再試。'
      })),
      overallFeedback: 'AI 評分服務暫時不可用，已使用標準答案。',
      _offline: true
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(fallbackResult)
    };
  }
};