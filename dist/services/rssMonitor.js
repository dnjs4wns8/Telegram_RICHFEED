"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSSMonitorService = void 0;
const rss_parser_1 = __importDefault(require("rss-parser"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
class RSSMonitorService {
    constructor() {
        this.processedTweets = new Set();
        this.lastCheckTime = new Date();
        this.parser = new rss_parser_1.default({
            timeout: 15000, // 15초로 증가
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
                'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            },
            customFields: {
                item: [
                    ['media:content', 'media'],
                    ['media:thumbnail', 'thumbnail']
                ]
            }
        });
    }
    /**
     * 모니터링 시작
     */
    startMonitoring() {
        logger_1.logger.info('DEBUG: RSS 모니터링 서비스를 시작합니다', {
            targetAccount: config_1.config.targetAccount,
            checkInterval: `${config_1.config.checkInterval / 1000}초`,
            nitterInstances: config_1.config.nitterInstances.length
        });
        // 즉시 첫 번째 체크 실행
        this.checkForNewTweets();
        // 주기적 체크 설정
        setInterval(() => {
            this.checkForNewTweets();
        }, config_1.config.checkInterval);
    }
    /**
     * 새 트윗 확인
     */
    async checkForNewTweets() {
        const currentTime = new Date();
        logger_1.logger.info('DEBUG: RSS 피드 확인 시작', {
            timestamp: currentTime.toISOString(),
            lastCheck: this.lastCheckTime.toISOString()
        });
        try {
            const tweets = await this.fetchTweets();
            if (tweets.length === 0) {
                logger_1.logger.warn('DEBUG: RSS 피드에서 트윗을 가져올 수 없습니다');
                return;
            }
            logger_1.logger.info('DEBUG: RSS 피드 확인 완료', {
                totalTweets: tweets.length,
                processedTweets: this.processedTweets.size
            });
            // 새 트윗 필터링
            const newTweets = tweets.filter(tweet => !this.processedTweets.has(tweet.id));
            if (newTweets.length > 0) {
                logger_1.logger.info('DEBUG: 새 트윗 발견', {
                    count: newTweets.length,
                    tweetIds: newTweets.map(t => t.id)
                });
                // 새 트윗 처리
                for (const tweet of newTweets) {
                    await this.processNewTweet(tweet);
                }
            }
            else {
                logger_1.logger.info('DEBUG: 새 트윗이 없습니다');
            }
            this.lastCheckTime = currentTime;
        }
        catch (error) {
            logger_1.logger.error('DEBUG: RSS 피드 확인 중 오류 발생', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
        }
    }
    /**
     * RSS 피드에서 트윗 가져오기
     */
    async fetchTweets() {
        const nitterInstance = (0, config_1.getRandomNitterInstance)();
        const feedUrl = `${nitterInstance}/${config_1.config.targetAccount}/rss`;
        logger_1.logger.info('DEBUG: RSS 피드 요청', {
            instance: nitterInstance,
            feedUrl: feedUrl
        });
        try {
            // 먼저 HTTP 요청으로 응답 확인
            const response = await axios_1.default.get(feedUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
                    'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                },
                validateStatus: (status) => {
                    return status >= 200 && status < 300; // 2xx 상태 코드만 성공으로 처리
                }
            });
            logger_1.logger.info('DEBUG: HTTP 응답 확인', {
                instance: nitterInstance,
                status: response.status,
                contentType: response.headers['content-type'],
                contentLength: response.data.length
            });
            // 응답 내용의 처음 500자 로깅 (디버깅용)
            const contentPreview = typeof response.data === 'string'
                ? response.data.substring(0, 500)
                : JSON.stringify(response.data).substring(0, 500);
            logger_1.logger.info('DEBUG: 응답 내용 미리보기', {
                instance: nitterInstance,
                contentPreview: contentPreview
            });
            // RSS 파싱
            const feed = await this.parser.parseString(response.data);
            logger_1.logger.info('DEBUG: RSS 피드 응답 성공', {
                instance: nitterInstance,
                itemCount: feed.items.length,
                feedTitle: feed.title
            });
            return feed.items.map((item) => this.parseTweetItem(item));
        }
        catch (error) {
            logger_1.logger.error('DEBUG: RSS 피드 요청 실패', {
                instance: nitterInstance,
                error: error instanceof Error ? error.message : String(error),
                errorType: error instanceof Error ? error.constructor.name : 'Unknown'
            });
            // 다른 인스턴스로 재시도
            return await this.retryWithOtherInstances();
        }
    }
    /**
     * 다른 Nitter 인스턴스로 재시도
     */
    async retryWithOtherInstances() {
        const usedInstances = new Set();
        for (let attempt = 1; attempt <= config_1.config.maxRetries; attempt++) {
            const availableInstances = config_1.config.nitterInstances.filter(instance => !usedInstances.has(instance));
            if (availableInstances.length === 0) {
                logger_1.logger.error('DEBUG: 모든 Nitter 인스턴스 시도 실패');
                return [];
            }
            const nitterInstance = availableInstances[Math.floor(Math.random() * availableInstances.length)];
            usedInstances.add(nitterInstance);
            const feedUrl = `${nitterInstance}/${config_1.config.targetAccount}/rss`;
            logger_1.logger.info('DEBUG: 재시도 중', {
                attempt,
                instance: nitterInstance,
                maxRetries: config_1.config.maxRetries
            });
            try {
                const response = await axios_1.default.get(feedUrl, {
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
                        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1'
                    },
                    validateStatus: (status) => {
                        return status >= 200 && status < 300;
                    }
                });
                // 응답 내용 확인
                const contentPreview = typeof response.data === 'string'
                    ? response.data.substring(0, 500)
                    : JSON.stringify(response.data).substring(0, 500);
                logger_1.logger.info('DEBUG: 재시도 응답 내용 미리보기', {
                    attempt,
                    instance: nitterInstance,
                    contentPreview: contentPreview
                });
                const feed = await this.parser.parseString(response.data);
                logger_1.logger.info('DEBUG: 재시도 성공', {
                    attempt,
                    instance: nitterInstance,
                    itemCount: feed.items.length
                });
                return feed.items.map((item) => this.parseTweetItem(item));
            }
            catch (error) {
                logger_1.logger.warn('DEBUG: 재시도 실패', {
                    attempt,
                    instance: nitterInstance,
                    error: error instanceof Error ? error.message : String(error),
                    errorType: error instanceof Error ? error.constructor.name : 'Unknown'
                });
                // 재시도 간격 대기
                if (attempt < config_1.config.maxRetries) {
                    await this.delay(config_1.config.retryDelay);
                }
            }
        }
        return [];
    }
    /**
     * RSS 아이템을 Tweet 객체로 변환
     */
    parseTweetItem(item) {
        const tweetId = this.extractTweetId(item.link || '');
        return {
            id: tweetId,
            title: item.title || '제목 없음',
            content: item.contentSnippet || item.content || '',
            link: item.link || '',
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            author: config_1.config.targetAccount,
            platform: 'twitter'
        };
    }
    /**
     * 트윗 URL에서 ID 추출
     */
    extractTweetId(url) {
        const match = url.match(/\/status\/(\d+)/);
        return match ? match[1] : `unknown_${Date.now()}`;
    }
    /**
     * 새 트윗 처리
     */
    async processNewTweet(tweet) {
        logger_1.logger.info('DEBUG: 새 트윗 처리 시작', {
            tweetId: tweet.id,
            title: tweet.title,
            publishedAt: tweet.publishedAt.toISOString(),
            contentLength: tweet.content.length
        });
        try {
            // 트윗 데이터 로깅
            logger_1.logger.info('DEBUG: 트윗 데이터', {
                tweetId: tweet.id,
                title: tweet.title,
                content: tweet.content,
                link: tweet.link,
                publishedAt: tweet.publishedAt.toISOString(),
                author: tweet.author
            });
            // 처리된 트윗으로 표시
            this.processedTweets.add(tweet.id);
            logger_1.logger.info('DEBUG: 트윗 처리 완료', {
                tweetId: tweet.id,
                processedTweetsCount: this.processedTweets.size
            });
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 트윗 처리 중 오류 발생', {
                tweetId: tweet.id,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * 지연 함수
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * 모니터링 상태 조회
     */
    getStatus() {
        return {
            isRunning: true,
            targetAccount: config_1.config.targetAccount,
            lastCheckTime: this.lastCheckTime.toISOString(),
            processedTweetsCount: this.processedTweets.size,
            checkInterval: config_1.config.checkInterval
        };
    }
}
exports.RSSMonitorService = RSSMonitorService;
//# sourceMappingURL=rssMonitor.js.map