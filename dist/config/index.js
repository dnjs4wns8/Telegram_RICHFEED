"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// 환경 변수 로드
dotenv_1.default.config();
exports.config = {
    accounts: [
        {
            name: 'Elonmusk',
            platform: 'twitter',
            rssAppFeedUrl: process.env.TWITTER_RSS_APP_FEED_URL || 'https://rss.app/feeds/v1.1/your-twitter-feed-id.json',
            displayName: '일론머스크 (트위터)'
        },
        {
            name: 'realDonaldTrump',
            platform: 'truthsocial',
            rssAppFeedUrl: process.env.TRUTHSOCIAL_RSS_APP_FEED_URL || 'https://rss.app/feeds/v1.1/your-truthsocial-feed-id.json',
            displayName: '도널드 트럼프 (트루스소셜)'
        }
    ],
    checkInterval: 60000, // 1분 (60000ms)
    maxRetries: 3,
    retryDelay: 5000 // 5초
};
//# sourceMappingURL=index.js.map