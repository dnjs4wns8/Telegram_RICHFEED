import dotenv from 'dotenv';
import { MonitoringConfig } from '../types';

// 환경 변수 로드
dotenv.config();

export const config: MonitoringConfig = {
  accounts: [
    {
      name: 'Elonmusk',
      platform: 'twitter',
      rssAppFeedUrl: process.env.TWITTER_RSS_APP_FEED_URL || 'https://rss.app/feeds/v1.1/your-twitter-feed-id.json',
      displayName: '일론머스크 (트위터)'
    },
    {
      name: 'LeeJaeMyung',
      platform: 'twitter',
      rssAppFeedUrl: process.env.LEEJAEMYUNG_RSS_APP_FEED_URL || 'https://rss.app/feeds/v1.1/your-leejaemyung-feed-id.json',
      displayName: '이재명 (트위터)'
    },
    // 트럼프 Truth Social 계정 임시 비활성화
    // {
    //   name: 'realDonaldTrump',
    //   platform: 'truthsocial',
    //   rssAppFeedUrl: process.env.TRUTHSOCIAL_RSS_APP_FEED_URL || 'https://rss.app/feeds/v1.1/your-truthsocial-feed-id.json',
    //   displayName: '도널드 트럼프 (트루스소셜)'
    // }
  ],
  checkInterval: 60000, // 1분 (60000ms)
  maxRetries: 3,
  retryDelay: 5000 // 5초
}; 