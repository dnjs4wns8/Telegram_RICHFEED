import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../utils/logger';
import { Tweet, RSSAppFeedItem } from '../types';
import { Translator } from '../utils/translator';

export class TelegramService {
  private bot?: TelegramBot;
  private translator: Translator;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    this.translator = new Translator();
    
    if (!token || !chatId) {
      logger.warn('DEBUG: 텔레그램 설정이 누락되었습니다. 텔레그램 전송이 비활성화됩니다.');
      return;
    }

    this.bot = new TelegramBot(token, { polling: false });
    logger.info('DEBUG: 텔레그램 서비스가 초기화되었습니다');
  }

  public async sendTweet(tweet: Tweet, accountName: string, originalItem?: RSSAppFeedItem): Promise<void> {
    if (!this.bot) {
      logger.warn('DEBUG: 텔레그램 봇이 초기화되지 않았습니다');
      return;
    }

    try {
      logger.info('DEBUG: 번역 시작', {
        tweetId: tweet.id,
        originalTitle: tweet.title,
        originalContentLength: tweet.content.length,
        originalContent: tweet.content.substring(0, 100) + '...'
      });

      // 콘텐츠 번역 (강제 번역)
      const translatedContent = await this.translator.translateHtmlContent(tweet.content);
      const translatedTitle = await this.translator.translateIfNeeded(tweet.title);
      
      logger.info('DEBUG: 번역 완료', {
        tweetId: tweet.id,
        originalTitle: tweet.title,
        translatedTitle: translatedTitle,
        originalContentLength: tweet.content.length,
        translatedContentLength: translatedContent.length,
        translatedContent: translatedContent.substring(0, 100) + '...'
      });
      
      // 번역된 콘텐츠로 메시지 생성
      const message = this.formatTweetMessage({
        ...tweet,
        title: translatedTitle,
        content: translatedContent
      }, accountName);
      
      // 재시도 로직으로 메시지 전송
      await this.sendMessageWithRetry(message, originalItem?.image, tweet.id, accountName);

    } catch (error) {
      logger.error('DEBUG: 텔레그램 메시지 전송 실패', {
        tweetId: tweet.id,
        accountName: accountName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 재시도 로직을 포함한 메시지 전송
   */
  private async sendMessageWithRetry(message: string, imageUrl?: string, tweetId?: string, accountName?: string, retryCount = 0): Promise<void> {
    const maxRetries = 3;
    const baseDelay = 2000; // 2초

    try {
      // 이미지가 있는 경우 이미지와 함께 메시지 전송
      if (imageUrl) {
        await this.bot!.sendPhoto(process.env.TELEGRAM_CHAT_ID!, imageUrl, {
          caption: message,
          parse_mode: 'HTML'
        });
        
        logger.info('DEBUG: 텔레그램 이미지 메시지 전송 성공', {
          tweetId: tweetId,
          accountName: accountName,
          hasImage: true,
          translated: true
        });
      } else {
        // 텍스트만 전송
        await this.bot!.sendMessage(process.env.TELEGRAM_CHAT_ID!, message, {
          parse_mode: 'HTML',
          disable_web_page_preview: false
        });
        
        logger.info('DEBUG: 텔레그램 텍스트 메시지 전송 성공', {
          tweetId: tweetId,
          accountName: accountName,
          hasImage: false,
          translated: true
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 429 에러 (Too Many Requests) 처리
      if (errorMessage.includes('429') && retryCount < maxRetries) {
        const retryAfter = this.extractRetryAfter(errorMessage);
        const delay = retryAfter || (baseDelay * Math.pow(2, retryCount)); // 지수 백오프
        
        logger.warn('DEBUG: 텔레그램 API 제한으로 재시도 대기', {
          tweetId: tweetId,
          accountName: accountName,
          retryCount: retryCount + 1,
          delay: delay,
          error: errorMessage
        });
        
        // 지연 후 재시도
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendMessageWithRetry(message, imageUrl, tweetId, accountName, retryCount + 1);
      }
      
      // 다른 에러 또는 최대 재시도 횟수 초과
      logger.error('DEBUG: 텔레그램 메시지 전송 실패', {
        tweetId: tweetId,
        accountName: accountName,
        retryCount: retryCount,
        error: errorMessage
      });
      
      throw error;
    }
  }

  /**
   * 429 에러에서 retry_after 값 추출
   */
  private extractRetryAfter(errorMessage: string): number | null {
    const match = errorMessage.match(/retry after (\d+)/i);
    if (match) {
      return parseInt(match[1]) * 1000; // 초를 밀리초로 변환
    }
    return null;
  }

  private formatTweetMessage(tweet: Tweet, accountName: string): string {
    const platform = tweet.platform === 'twitter' ? '🐦 트위터' : '🔴 트루스소셜';
    
    // 번역된 콘텐츠 사용
    const content = tweet.content.length > 3000 
      ? tweet.content.substring(0, 3000) + '...' 
      : tweet.content;

    // HTML 태그 정리 (텔레그램에서 지원하는 태그만 사용)
    const cleanContent = this.cleanHtmlContent(content);

    return `
<b>${platform} - ${accountName}</b>

📝 <b>${tweet.title}</b>

${cleanContent}

🔗 <a href="${tweet.link}">원문 보기</a>

⏰ ${tweet.publishedAt.toLocaleString('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})}
    `.trim();
  }

  private cleanHtmlContent(content: string): string {
    // HTML 태그를 텔레그램에서 지원하는 형태로 변환
    return content
      .replace(/<br\s*\/?>/gi, '\n') // <br> 태그를 줄바꿈으로
      .replace(/<p>/gi, '') // <p> 시작 태그 제거
      .replace(/<\/p>/gi, '\n\n') // <p> 끝 태그를 이중 줄바꿈으로
      .replace(/<[^>]*>/g, '') // 기타 HTML 태그 제거
      .replace(/&nbsp;/g, ' ') // &nbsp;를 공백으로
      .replace(/&amp;/g, '&') // &amp;를 &로
      .replace(/&lt;/g, '<') // &lt;를 <로
      .replace(/&gt;/g, '>') // &gt;를 >로
      .replace(/&quot;/g, '"') // &quot;를 "로
      .replace(/&#39;/g, "'") // &#39;를 '로
      .trim();
  }

  public isEnabled(): boolean {
    return !!this.bot;
  }
} 