"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLService = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const logger_1 = require("../utils/logger");
class MySQLService {
    constructor() {
        const connectionConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'rss_monitor',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        };
        this.pool = promise_1.default.createPool(connectionConfig);
        logger_1.logger.info('DEBUG: MySQL 연결 풀이 초기화되었습니다', {
            host: connectionConfig.host,
            port: connectionConfig.port,
            database: connectionConfig.database
        });
    }
    /**
     * 데이터베이스 초기화 (테이블 생성)
     */
    async initializeDatabase() {
        const connection = await this.pool.getConnection();
        try {
            // 처리된 트윗 테이블 생성
            await connection.execute(`
        CREATE TABLE IF NOT EXISTS processed_tweets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          account_name VARCHAR(100) NOT NULL,
          tweet_id VARCHAR(255) NOT NULL,
          platform VARCHAR(50) NOT NULL,
          processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_account_tweet (account_name, tweet_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
            // 인덱스 생성 (성능 향상)
            try {
                await connection.execute(`
          CREATE INDEX IF NOT EXISTS idx_processed_tweets_account 
          ON processed_tweets(account_name)
        `);
            }
            catch (error) {
                logger_1.logger.warn('DEBUG: account_name 인덱스 생성 실패', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
            try {
                await connection.execute(`
          CREATE INDEX IF NOT EXISTS idx_processed_tweets_tweet_id 
          ON processed_tweets(tweet_id)
        `);
            }
            catch (error) {
                logger_1.logger.warn('DEBUG: tweet_id 인덱스 생성 실패', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
            logger_1.logger.info('DEBUG: MySQL 데이터베이스가 초기화되었습니다');
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 데이터베이스 초기화 실패', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /**
     * 처리된 트윗 ID 저장
     */
    async saveProcessedTweet(accountName, tweetId, platform) {
        const connection = await this.pool.getConnection();
        try {
            await connection.execute('INSERT IGNORE INTO processed_tweets (account_name, tweet_id, platform) VALUES (?, ?, ?)', [accountName, tweetId, platform]);
            logger_1.logger.debug('DEBUG: 처리된 트윗을 데이터베이스에 저장했습니다', {
                accountName,
                tweetId,
                platform
            });
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 처리된 트윗 저장 실패', {
                accountName,
                tweetId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
        finally {
            connection.release();
        }
    }
    /**
     * 처리된 트윗 ID 목록 조회
     */
    async getProcessedTweetIds(accountName) {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute('SELECT tweet_id FROM processed_tweets WHERE account_name = ?', [accountName]);
            const tweetIds = new Set(rows.map((row) => row.tweet_id));
            logger_1.logger.debug('DEBUG: 처리된 트윗 ID 목록을 조회했습니다', {
                accountName,
                count: tweetIds.size
            });
            return tweetIds;
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 처리된 트윗 ID 조회 실패', {
                accountName,
                error: error instanceof Error ? error.message : String(error)
            });
            return new Set();
        }
        finally {
            connection.release();
        }
    }
    /**
     * 모든 계정의 처리된 트윗 ID 목록 조회
     */
    async getAllProcessedTweetIds() {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute('SELECT account_name, tweet_id FROM processed_tweets ORDER BY account_name');
            const processedTweets = new Map();
            rows.forEach((row) => {
                const { account_name, tweet_id } = row;
                if (!processedTweets.has(account_name)) {
                    processedTweets.set(account_name, new Set());
                }
                processedTweets.get(account_name).add(tweet_id);
            });
            logger_1.logger.info('DEBUG: 모든 처리된 트윗 ID 목록을 조회했습니다', {
                accountCount: processedTweets.size,
                totalTweets: Array.from(processedTweets.values()).reduce((sum, set) => sum + set.size, 0)
            });
            return processedTweets;
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 모든 처리된 트윗 ID 조회 실패', {
                error: error instanceof Error ? error.message : String(error)
            });
            return new Map();
        }
        finally {
            connection.release();
        }
    }
    /**
     * 데이터베이스 연결 테스트
     */
    async testConnection() {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute('SELECT NOW() as current_time');
            logger_1.logger.info('DEBUG: MySQL 연결 테스트 성공', {
                timestamp: rows[0].current_time
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('DEBUG: MySQL 연결 테스트 실패', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
        finally {
            connection.release();
        }
    }
    /**
     * 연결 풀 종료
     */
    async close() {
        await this.pool.end();
        logger_1.logger.info('DEBUG: MySQL 연결 풀이 종료되었습니다');
    }
}
exports.MySQLService = MySQLService;
//# sourceMappingURL=mysqlService.js.map