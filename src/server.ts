import { RSSAppMonitorService } from './services/rssAppMonitor';
import { logger, ensureLogDirectory } from './utils/logger';
import * as http from 'http';

class Server {
  private rssAppMonitor?: RSSAppMonitorService;
  private httpServer?: http.Server;

  constructor() {
    // 환경변수 확인 후 서비스 초기화
    this.initializeServices();
  }

  private initializeServices(): void {
    try {
      // 필수 환경변수 확인
      const requiredEnvVars = [
        'RSS_APP_FEED_URL_ELON',
        'RSS_APP_FEED_URL_TRUMP', 
        'RSS_APP_FEED_URL_MARKET',
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_CHAT_ID'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        logger.warn('DEBUG: 일부 환경변수가 누락되었습니다', { missingVars });
        // 환경변수가 없어도 HTTP 서버는 시작
        return;
      }

      this.rssAppMonitor = new RSSAppMonitorService();
      logger.info('DEBUG: RSSAppMonitorService가 초기화되었습니다');

    } catch (error) {
      logger.error('DEBUG: 서비스 초기화 중 오류 발생', {
        error: error instanceof Error ? error.message : String(error)
      });
      // 에러가 있어도 HTTP 서버는 시작
    }
  }

  public start(): void {
    try {
      // 로그 디렉토리 생성 (실패해도 계속 진행)
      try {
        ensureLogDirectory();
      } catch (error) {
        logger.warn('DEBUG: 로그 디렉토리 생성 실패, 계속 진행', {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      logger.info('DEBUG: 서버를 시작합니다');

      // HTTP 서버 먼저 시작 (Railway 헬스체크용)
      this.startHttpServer();

      // 프로세스 종료 시그널 처리
      this.setupGracefulShutdown();

      // RSS 모니터링 서비스가 초기화된 경우에만 시작
      if (this.rssAppMonitor) {
        try {
          this.rssAppMonitor.startMonitoring();
          logger.info('DEBUG: RSS 모니터링이 시작되었습니다');
          
          // 상태 로깅 주기적 실행
          this.startStatusLogging();
        } catch (error) {
          logger.error('DEBUG: RSS 모니터링 시작 실패', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      } else {
        logger.warn('DEBUG: RSS 모니터링 서비스가 초기화되지 않아 모니터링을 시작하지 않습니다');
      }

      logger.info('DEBUG: 서버가 성공적으로 시작되었습니다');

    } catch (error) {
      logger.error('DEBUG: 서버 시작 중 오류 발생', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // 서버 시작 실패해도 프로세스는 종료하지 않음 (HTTP 서버는 계속 실행)
    }
  }

  private startHttpServer(): void {
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
        } else if (req.url === '/health' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'healthy' }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not Found' }));
        }
      } catch (error) {
        logger.error('DEBUG: HTTP 요청 처리 중 오류', {
          error: error instanceof Error ? error.message : String(error)
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });

    this.httpServer.listen(port, () => {
      logger.info('DEBUG: HTTP 서버가 시작되었습니다', { port });
    });

    // HTTP 서버 에러 처리
    this.httpServer.on('error', (error) => {
      logger.error('DEBUG: HTTP 서버 에러', {
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      logger.info('DEBUG: 서버 종료 시그널 수신', { signal });
      
      // HTTP 서버 종료
      if (this.httpServer) {
        this.httpServer.close(() => {
          logger.info('DEBUG: HTTP 서버가 종료되었습니다');
        });
      }
      
      // 정리 작업 수행
      logger.info('DEBUG: 서버를 안전하게 종료합니다');
      
      setTimeout(() => {
        logger.info('DEBUG: 서버가 종료되었습니다');
        process.exit(0);
      }, 1000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  private startStatusLogging(): void {
    if (!this.rssAppMonitor) return;
    
    // 5분마다 상태 로깅
    setInterval(() => {
      try {
        const status = this.rssAppMonitor!.getStatus();
        logger.info('DEBUG: 서버 상태', status);
      } catch (error) {
        logger.error('DEBUG: 상태 로깅 중 오류', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 5 * 60 * 1000); // 5분
  }
}

// 서버 시작
const server = new Server();
server.start(); 