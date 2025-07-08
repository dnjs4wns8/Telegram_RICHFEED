import axios from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config';
import { Tweet, RSSAppResponse, RSSAppFeedItem, AccountConfig } from '../types';
import { TelegramService } from './telegramService';
import { MySQLService } from './mysqlService';

export class RSSAppMonitorService {
  private processedTweets: Map<string, Set<string>> = new Map(); // accountName -> Set of tweet IDs
  private lastCheckTime: Map<string, Date> = new Map(); // accountName -> last check time
  private telegramService: TelegramService;
  private mysqlService: MySQLService;

  constructor() {
    // 텔레그램 서비스 초기화
    this.telegramService = new TelegramService();
    
    // MySQL 서비스 초기화
    this.mysqlService = new MySQLService();
    
    // 각 계정별로 처리된 트윗 추적 초기화
    config.accounts.forEach(account => {
      if (!this.lastCheckTime.has(account.name)) {
        this.lastCheckTime.set(account.name, new Date());
      }
    });
  }

  /**
   * 모니터링 시작
   */
  public async startMonitoring(): Promise<void> {
    try {
      // MySQL 데이터베이스 초기화
      await this.mysqlService.initializeDatabase();
      
      // 처리된 트윗 데이터 로드
      this.processedTweets = await this.mysqlService.getAllProcessedTweetIds();
      
      logger.info('DEBUG: RSS.app 다중 계정 모니터링 서비스를 시작합니다', {
        accountCount: config.accounts.length,
        accounts: config.accounts.map(acc => `${acc.displayName} (${acc.platform})`),
        checkInterval: `${config.checkInterval / 1000}초`,
        loadedProcessedTweets: Array.from(this.processedTweets.values()).reduce((sum, set) => sum + set.size, 0)
      });

      // 즉시 첫 번째 체크 실행
      this.checkAllAccounts();

      // 주기적 체크 설정
      setInterval(() => {
        this.checkAllAccounts();
      }, config.checkInterval);
      
    } catch (error) {
      logger.error('DEBUG: 모니터링 시작 실패', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 모든 계정 확인
   */
  private async checkAllAccounts(): Promise<void> {
    const currentTime = new Date();
    logger.info('DEBUG: 모든 계정 RSS.app 피드 확인 시작', {
      timestamp: currentTime.toISOString(),
      accountCount: config.accounts.length
    });

    // 모든 계정을 병렬로 확인
    const checkPromises = config.accounts.map(account => 
      this.checkAccount(account, currentTime)
    );

    try {
      await Promise.allSettled(checkPromises);
      logger.info('DEBUG: 모든 계정 확인 완료');
    } catch (error) {
      logger.error('DEBUG: 계정 확인 중 오류 발생', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 특정 계정 확인
   */
  private async checkAccount(account: AccountConfig, currentTime: Date): Promise<void> {
    const lastCheck = this.lastCheckTime.get(account.name) || new Date();
    
    logger.info('DEBUG: 계정 확인 시작', {
      account: account.displayName,
      platform: account.platform,
      lastCheck: lastCheck.toISOString()
    });

    try {
      const tweetData = await this.fetchTweets(account);
      
      if (tweetData.length === 0) {
        logger.warn('DEBUG: 계정에서 트윗을 가져올 수 없습니다', {
          account: account.displayName
        });
        return;
      }

      logger.info('DEBUG: 계정 피드 확인 완료', {
        account: account.displayName,
        totalTweets: tweetData.length,
        processedTweets: this.processedTweets.get(account.name)?.size || 0
      });

      // 새 트윗 필터링
      const processedTweets = this.processedTweets.get(account.name) || new Set();
      const newTweetData = tweetData.filter(data => !processedTweets.has(data.tweet.id));
      
      if (newTweetData.length > 0) {
        logger.info('DEBUG: 새 트윗 발견', {
          account: account.displayName,
          count: newTweetData.length,
          tweetIds: newTweetData.map(data => data.tweet.id)
        });

        // 새 트윗 처리
        for (const data of newTweetData) {
          await this.processNewTweet(data.tweet, account, data.originalItem);
        }
      } else {
        logger.info('DEBUG: 새 트윗이 없습니다', {
          account: account.displayName
        });
      }

      this.lastCheckTime.set(account.name, currentTime);

    } catch (error) {
      logger.error('DEBUG: 계정 확인 중 오류 발생', {
        account: account.displayName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * RSS.app에서 트윗 가져오기
   */
  private async fetchTweets(account: AccountConfig): Promise<{ tweet: Tweet; originalItem: RSSAppFeedItem }[]> {
    logger.info('DEBUG: RSS.app 피드 요청', {
      account: account.displayName,
      feedUrl: account.rssAppFeedUrl
    });

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, application/xml, text/xml, */*'
      };

      const response = await axios.get<RSSAppResponse>(account.rssAppFeedUrl, {
        timeout: 15000,
        headers
      });

      logger.info('DEBUG: RSS.app 응답 확인', {
        account: account.displayName,
        status: response.status,
        contentType: response.headers['content-type'],
        feedTitle: response.data.title,
        itemCount: response.data.items?.length || 0
      });

      if (!response.data.items || response.data.items.length === 0) {
        logger.warn('DEBUG: RSS.app 피드에 아이템이 없습니다', {
          account: account.displayName
        });
        return [];
      }

      // 첫 번째 아이템 구조 로깅 (디버깅용)
      const firstItem = response.data.items[0];
      logger.info('DEBUG: RSS.app 아이템 구조 확인', {
        account: account.displayName,
        firstItem: {
          id: firstItem.id,
          title: firstItem.title,
          url: firstItem.url,
          content_text: firstItem.content_text?.substring(0, 100) + '...',
          date_published: firstItem.date_published,
          authors: firstItem.authors
        }
      });

      // RSS.app 아이템을 Tweet 객체로 변환
      const tweets = response.data.items.map(item => this.parseRSSAppItem(item, account));

      logger.info('DEBUG: RSS.app 피드 파싱 성공', {
        account: account.displayName,
        parsedTweets: tweets.length
      });

      return tweets.map((tweet, index) => ({
        tweet,
        originalItem: response.data.items[index]
      }));

    } catch (error) {
      logger.error('DEBUG: RSS.app 피드 요청 실패', {
        account: account.displayName,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });

      return [];
    }
  }

  /**
   * RSS.app 아이템을 Tweet 객체로 변환
   */
  private parseRSSAppItem(item: RSSAppFeedItem, account: AccountConfig): Tweet {
    // 트윗 ID 추출 (URL에서)
    const tweetId = this.extractTweetId(item.url || '', account.platform);
    
    return {
      id: tweetId,
      title: item.title || '제목 없음',
      content: item.content_text || item.content_html || '',
      link: item.url || '',
      publishedAt: item.date_published ? new Date(item.date_published) : new Date(),
      author: account.name,
      platform: account.platform
    };
  }

  /**
   * 트윗 URL에서 ID 추출
   */
  private extractTweetId(url: string, platform: 'twitter' | 'truthsocial'): string {
    // URL이 없거나 빈 문자열인 경우 타임스탬프 기반 ID 생성
    if (!url || url.trim() === '') {
      return `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (platform === 'twitter') {
      // Twitter URL에서 트윗 ID 추출
      const twitterMatch = url.match(/\/status\/(\d+)/);
      if (twitterMatch) {
        return twitterMatch[1];
      }
    } else if (platform === 'truthsocial') {
      // Truth Social URL에서 게시글 ID 추출
      const truthSocialMatch = url.match(/\/posts\/([^\/]+)/);
      if (truthSocialMatch) {
        return truthSocialMatch[1];
      }
    }
    
    // 타임스탬프 기반 ID 생성
    return `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 새 트윗 처리
   */
  private async processNewTweet(tweet: Tweet, account: AccountConfig, originalItem?: RSSAppFeedItem): Promise<void> {
    logger.info('DEBUG: 새 트윗 처리 시작', {
      account: account.displayName,
      platform: tweet.platform,
      tweetId: tweet.id,
      title: tweet.title,
      publishedAt: tweet.publishedAt.toISOString(),
      contentLength: tweet.content.length
    });

    try {
      // 트윗 데이터 로깅
      logger.info('DEBUG: 트윗 데이터', {
        account: account.displayName,
        platform: tweet.platform,
        tweetId: tweet.id,
        title: tweet.title,
        content: tweet.content,
        link: tweet.link,
        publishedAt: tweet.publishedAt.toISOString(),
        author: tweet.author
      });

      // 텔레그램으로 전송
      if (this.telegramService.isEnabled()) {
        await this.telegramService.sendTweet(tweet, account.displayName, originalItem);
      } else {
        logger.info('DEBUG: 텔레그램이 비활성화되어 있습니다');
      }

      // 처리된 트윗으로 표시 (메모리)
      const processedTweets = this.processedTweets.get(account.name) || new Set();
      processedTweets.add(tweet.id);
      this.processedTweets.set(account.name, processedTweets);

      // 처리된 트윗을 MySQL에 저장
      await this.mysqlService.saveProcessedTweet(account.name, tweet.id, tweet.platform);

      logger.info('DEBUG: 트윗 처리 완료', {
        account: account.displayName,
        tweetId: tweet.id,
        processedTweetsCount: processedTweets.size,
        telegramSent: this.telegramService.isEnabled()
      });

    } catch (error) {
      logger.error('DEBUG: 트윗 처리 중 오류 발생', {
        account: account.displayName,
        tweetId: tweet.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 모니터링 상태 조회
   */
  public getStatus(): object {
    const accountStatuses = config.accounts.map(account => ({
      name: account.displayName,
      platform: account.platform,
      lastCheckTime: this.lastCheckTime.get(account.name)?.toISOString(),
      processedTweetsCount: this.processedTweets.get(account.name)?.size || 0
    }));

    return {
      isRunning: true,
      accountCount: config.accounts.length,
      accounts: accountStatuses,
      checkInterval: config.checkInterval,
      method: 'rss-app'
    };
  }

} 