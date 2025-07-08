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
Object.defineProperty(exports, "__esModule", { value: true });
const rssAppMonitor_1 = require("./services/rssAppMonitor");
const logger_1 = require("./utils/logger");
const http = __importStar(require("http"));
class Server {
    constructor() {
        // 환경변수 확인 후 서비스 초기화
        this.initializeServices();
    }
    initializeServices() {
        try {
            // RSS.app 모니터링 서비스 초기화
            const requiredRSSEnvVars = [
                'TWITTER_RSS_APP_FEED_URL',
                'TRUTHSOCIAL_RSS_APP_FEED_URL',
                'TELEGRAM_BOT_TOKEN',
                'TELEGRAM_CHAT_ID'
            ];
            const missingRSSVars = requiredRSSEnvVars.filter(varName => !process.env[varName]);
            if (missingRSSVars.length > 0) {
                logger_1.logger.warn('DEBUG: RSS.app 모니터링을 위한 환경변수가 누락되었습니다', { missingRSSVars });
            }
            else {
                this.rssAppMonitor = new rssAppMonitor_1.RSSAppMonitorService();
                logger_1.logger.info('DEBUG: RSSAppMonitorService가 초기화되었습니다');
            }
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 서비스 초기화 중 오류 발생', {
                error: error instanceof Error ? error.message : String(error)
            });
            // 에러가 있어도 HTTP 서버는 시작
        }
    }
    async start() {
        try {
            // 로그 디렉토리 생성 (실패해도 계속 진행)
            try {
                (0, logger_1.ensureLogDirectory)();
            }
            catch (error) {
                logger_1.logger.warn('DEBUG: 로그 디렉토리 생성 실패, 계속 진행', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
            logger_1.logger.info('DEBUG: 서버를 시작합니다');
            // HTTP 서버 먼저 시작 (Railway 헬스체크용)
            this.startHttpServer();
            // 프로세스 종료 시그널 처리
            this.setupGracefulShutdown();
            // RSS 모니터링 서비스가 초기화된 경우에만 시작
            if (this.rssAppMonitor) {
                try {
                    await this.rssAppMonitor.startMonitoring();
                    logger_1.logger.info('DEBUG: RSS 모니터링이 시작되었습니다');
                    // 상태 로깅 주기적 실행
                    this.startStatusLogging();
                }
                catch (error) {
                    logger_1.logger.error('DEBUG: RSS 모니터링 시작 실패', {
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
            else {
                logger_1.logger.warn('DEBUG: RSS 모니터링 서비스가 초기화되지 않아 모니터링을 시작하지 않습니다');
            }
            logger_1.logger.info('DEBUG: 서버가 성공적으로 시작되었습니다');
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 서버 시작 중 오류 발생', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            // 서버 시작 실패해도 프로세스는 종료하지 않음 (HTTP 서버는 계속 실행)
        }
    }
    startHttpServer() {
        const port = process.env.PORT || 3000;
        this.httpServer = http.createServer((req, res) => {
            try {
                if (req.url === '/' && req.method === 'GET') {
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type'
                    });
                    res.end(JSON.stringify({
                        status: 'OK',
                        message: 'RSS Monitor Service is running',
                        timestamp: new Date().toISOString(),
                        uptime: process.uptime(),
                        rssMonitoring: !!this.rssAppMonitor,
                        environment: process.env.NODE_ENV || 'development'
                    }));
                }
                else if (req.url === '/health' && req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'healthy' }));
                }
                else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Not Found' }));
                }
            }
            catch (error) {
                logger_1.logger.error('DEBUG: HTTP 요청 처리 중 오류', {
                    error: error instanceof Error ? error.message : String(error)
                });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
        });
        this.httpServer.listen(port, () => {
            logger_1.logger.info('DEBUG: HTTP 서버가 시작되었습니다', { port });
        });
        // HTTP 서버 에러 처리
        this.httpServer.on('error', (error) => {
            logger_1.logger.error('DEBUG: HTTP 서버 에러', {
                error: error instanceof Error ? error.message : String(error)
            });
        });
    }
    setupGracefulShutdown() {
        const shutdown = (signal) => {
            logger_1.logger.info('DEBUG: 서버 종료 시그널 수신', { signal });
            // HTTP 서버 종료
            if (this.httpServer) {
                this.httpServer.close(() => {
                    logger_1.logger.info('DEBUG: HTTP 서버가 종료되었습니다');
                });
            }
            // 정리 작업 수행
            logger_1.logger.info('DEBUG: 서버를 안전하게 종료합니다');
            setTimeout(() => {
                logger_1.logger.info('DEBUG: 서버가 종료되었습니다');
                process.exit(0);
            }, 1000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    startStatusLogging() {
        if (!this.rssAppMonitor)
            return;
        // 5분마다 상태 로깅
        setInterval(() => {
            try {
                const status = this.rssAppMonitor.getStatus();
                logger_1.logger.info('DEBUG: 서버 상태', status);
            }
            catch (error) {
                logger_1.logger.error('DEBUG: 상태 로깅 중 오류', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }, 5 * 60 * 1000); // 5분
    }
}
// 서버 시작
const server = new Server();
server.start();
//# sourceMappingURL=server.js.map