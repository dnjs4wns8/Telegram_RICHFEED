"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSSAppMonitorService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const telegramService_1 = require("./telegramService");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class RSSAppMonitorService {
    constructor() {
        this.processedTweets = new Map(); // accountName -> Set of tweet IDs
        this.lastCheckTime = new Map(); // accountName -> last check time
        // 텔레그램 서비스 초기화
        this.telegramService = new telegramService_1.TelegramService();
        // 데이터 디렉토리 설정 (Railway 볼륨 우선, 없으면 로컬)
        this.dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
        this.processedTweetsFile = path.join(this.dataDir, 'processed_tweets.json');
        // 데이터 디렉토리 생성
        this.ensureDataDirectory();
        // 저장된 처리된 트윗 로드
        this.loadProcessedTweets();
        // 각 계정별로 처리된 트윗 추적 초기화
        config_1.config.accounts.forEach(account => {
            if (!this.processedTweets.has(account.name)) {
                this.processedTweets.set(account.name, new Set());
            }
            if (!this.lastCheckTime.has(account.name)) {
                this.lastCheckTime.set(account.name, new Date());
            }
        });
    }
    /**
     * 모니터링 시작
     */
    startMonitoring() {
        logger_1.logger.info('DEBUG: RSS.app 다중 계정 모니터링 서비스를 시작합니다', {
            accountCount: config_1.config.accounts.length,
            accounts: config_1.config.accounts.map(acc => `${acc.displayName} (${acc.platform})`),
            checkInterval: `${config_1.config.checkInterval / 1000}초`
        });
        // 즉시 첫 번째 체크 실행
        this.checkAllAccounts();
        // 주기적 체크 설정
        setInterval(() => {
            this.checkAllAccounts();
        }, config_1.config.checkInterval);
    }
    /**
     * 모든 계정 확인
     */
    async checkAllAccounts() {
        const currentTime = new Date();
        logger_1.logger.info('DEBUG: 모든 계정 RSS.app 피드 확인 시작', {
            timestamp: currentTime.toISOString(),
            accountCount: config_1.config.accounts.length
        });
        // 모든 계정을 병렬로 확인
        const checkPromises = config_1.config.accounts.map(account => this.checkAccount(account, currentTime));
        try {
            await Promise.allSettled(checkPromises);
            logger_1.logger.info('DEBUG: 모든 계정 확인 완료');
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 계정 확인 중 오류 발생', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * 특정 계정 확인
     */
    async checkAccount(account, currentTime) {
        const lastCheck = this.lastCheckTime.get(account.name) || new Date();
        logger_1.logger.info('DEBUG: 계정 확인 시작', {
            account: account.displayName,
            platform: account.platform,
            lastCheck: lastCheck.toISOString()
        });
        try {
            const tweetData = await this.fetchTweets(account);
            if (tweetData.length === 0) {
                logger_1.logger.warn('DEBUG: 계정에서 트윗을 가져올 수 없습니다', {
                    account: account.displayName
                });
                return;
            }
            logger_1.logger.info('DEBUG: 계정 피드 확인 완료', {
                account: account.displayName,
                totalTweets: tweetData.length,
                processedTweets: this.processedTweets.get(account.name)?.size || 0
            });
            // 새 트윗 필터링
            const processedTweets = this.processedTweets.get(account.name) || new Set();
            const newTweetData = tweetData.filter(data => !processedTweets.has(data.tweet.id));
            if (newTweetData.length > 0) {
                logger_1.logger.info('DEBUG: 새 트윗 발견', {
                    account: account.displayName,
                    count: newTweetData.length,
                    tweetIds: newTweetData.map(data => data.tweet.id)
                });
                // 새 트윗 처리
                for (const data of newTweetData) {
                    await this.processNewTweet(data.tweet, account, data.originalItem);
                }
            }
            else {
                logger_1.logger.info('DEBUG: 새 트윗이 없습니다', {
                    account: account.displayName
                });
            }
            this.lastCheckTime.set(account.name, currentTime);
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 계정 확인 중 오류 발생', {
                account: account.displayName,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
        }
    }
    /**
     * RSS.app에서 트윗 가져오기
     */
    async fetchTweets(account) {
        logger_1.logger.info('DEBUG: RSS.app 피드 요청', {
            account: account.displayName,
            feedUrl: account.rssAppFeedUrl
        });
        try {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, application/xml, text/xml, */*'
            };
            const response = await axios_1.default.get(account.rssAppFeedUrl, {
                timeout: 15000,
                headers
            });
            logger_1.logger.info('DEBUG: RSS.app 응답 확인', {
                account: account.displayName,
                status: response.status,
                contentType: response.headers['content-type'],
                feedTitle: response.data.title,
                itemCount: response.data.items?.length || 0
            });
            if (!response.data.items || response.data.items.length === 0) {
                logger_1.logger.warn('DEBUG: RSS.app 피드에 아이템이 없습니다', {
                    account: account.displayName
                });
                return [];
            }
            // 첫 번째 아이템 구조 로깅 (디버깅용)
            const firstItem = response.data.items[0];
            logger_1.logger.info('DEBUG: RSS.app 아이템 구조 확인', {
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
            logger_1.logger.info('DEBUG: RSS.app 피드 파싱 성공', {
                account: account.displayName,
                parsedTweets: tweets.length
            });
            return tweets.map((tweet, index) => ({
                tweet,
                originalItem: response.data.items[index]
            }));
        }
        catch (error) {
            logger_1.logger.error('DEBUG: RSS.app 피드 요청 실패', {
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
    parseRSSAppItem(item, account) {
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
    extractTweetId(url, platform) {
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
        }
        else if (platform === 'truthsocial') {
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
    async processNewTweet(tweet, account, originalItem) {
        logger_1.logger.info('DEBUG: 새 트윗 처리 시작', {
            account: account.displayName,
            platform: tweet.platform,
            tweetId: tweet.id,
            title: tweet.title,
            publishedAt: tweet.publishedAt.toISOString(),
            contentLength: tweet.content.length
        });
        try {
            // 트윗 데이터 로깅
            logger_1.logger.info('DEBUG: 트윗 데이터', {
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
            }
            else {
                logger_1.logger.info('DEBUG: 텔레그램이 비활성화되어 있습니다');
            }
            // 처리된 트윗으로 표시
            const processedTweets = this.processedTweets.get(account.name) || new Set();
            processedTweets.add(tweet.id);
            this.processedTweets.set(account.name, processedTweets);
            // 처리된 트윗을 파일에 저장
            this.saveProcessedTweets();
            logger_1.logger.info('DEBUG: 트윗 처리 완료', {
                account: account.displayName,
                tweetId: tweet.id,
                processedTweetsCount: processedTweets.size,
                telegramSent: this.telegramService.isEnabled()
            });
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 트윗 처리 중 오류 발생', {
                account: account.displayName,
                tweetId: tweet.id,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * 모니터링 상태 조회
     */
    getStatus() {
        const accountStatuses = config_1.config.accounts.map(account => ({
            name: account.displayName,
            platform: account.platform,
            lastCheckTime: this.lastCheckTime.get(account.name)?.toISOString(),
            processedTweetsCount: this.processedTweets.get(account.name)?.size || 0
        }));
        return {
            isRunning: true,
            accountCount: config_1.config.accounts.length,
            accounts: accountStatuses,
            checkInterval: config_1.config.checkInterval,
            method: 'rss-app'
        };
    }
    /**
     * 데이터 디렉토리 생성
     */
    ensureDataDirectory() {
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
                logger_1.logger.info('DEBUG: 데이터 디렉토리가 생성되었습니다', { dataDir: this.dataDir });
            }
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 데이터 디렉토리 생성 실패', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * 처리된 트윗 로드
     */
    loadProcessedTweets() {
        try {
            if (fs.existsSync(this.processedTweetsFile)) {
                const data = fs.readFileSync(this.processedTweetsFile, 'utf8');
                const savedData = JSON.parse(data);
                // Map과 Set으로 변환
                Object.keys(savedData).forEach(accountName => {
                    this.processedTweets.set(accountName, new Set(savedData[accountName]));
                });
                logger_1.logger.info('DEBUG: 처리된 트윗 데이터를 로드했습니다', {
                    accountCount: this.processedTweets.size,
                    totalProcessedTweets: Array.from(this.processedTweets.values()).reduce((sum, set) => sum + set.size, 0)
                });
            }
            else {
                logger_1.logger.info('DEBUG: 처리된 트윗 데이터 파일이 없어 새로 시작합니다');
            }
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 처리된 트윗 데이터 로드 실패', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * 처리된 트윗 저장
     *
     * 향후 개선 방안:
     * - Railway PostgreSQL 사용
     * - MongoDB Atlas 사용
     * - Redis 사용
     * - Supabase 사용
     */
    saveProcessedTweets() {
        try {
            // Map과 Set을 JSON으로 변환
            const dataToSave = {};
            this.processedTweets.forEach((tweetSet, accountName) => {
                dataToSave[accountName] = Array.from(tweetSet);
            });
            fs.writeFileSync(this.processedTweetsFile, JSON.stringify(dataToSave, null, 2));
            logger_1.logger.debug('DEBUG: 처리된 트윗 데이터를 저장했습니다', {
                accountCount: this.processedTweets.size,
                totalProcessedTweets: Array.from(this.processedTweets.values()).reduce((sum, set) => sum + set.size, 0)
            });
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 처리된 트윗 데이터 저장 실패', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
}
exports.RSSAppMonitorService = RSSAppMonitorService;
//# sourceMappingURL=rssAppMonitor.js.map