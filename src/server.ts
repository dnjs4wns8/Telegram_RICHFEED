import { RSSAppMonitorService } from './services/rssAppMonitor';
import { logger, ensureLogDirectory } from './utils/logger';
import * as http from 'http';

class Server {
  private rssAppMonitor: RSSAppMonitorService;
  private httpServer?: http.Server;

  constructor() {
    this.rssAppMonitor = new RSSAppMonitorService();
  }

  public start(): void {
    try {
      // 로그 디렉토리 생성
      ensureLogDirectory();

      logger.info('DEBUG: RSS.app 다중 계정 모니터링 서버를 시작합니다');

      // HTTP 서버 시작 (Railway 헬스체크용)
      this.startHttpServer();

      // 프로세스 종료 시그널 처리
      this.setupGracefulShutdown();

      // RSS.app 모니터링 시작
      this.rssAppMonitor.startMonitoring();

      logger.info('DEBUG: RSS.app 다중 계정 모니터링 서버가 성공적으로 시작되었습니다');

      // 상태 로깅 주기적 실행
      this.startStatusLogging();

    } catch (error) {
      logger.error('DEBUG: 서버 시작 중 오류 발생', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      process.exit(1);
    }
  }

  private startHttpServer(): void {
    const port = process.env.PORT || 3000;
    
    this.httpServer = http.createServer((req, res) => {
      if (req.url === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'OK',
          message: 'RSS Monitor Service is running',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });

    this.httpServer.listen(port, () => {
      logger.info('DEBUG: HTTP 서버가 시작되었습니다', { port });
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
    // 5분마다 상태 로깅
    setInterval(() => {
      const status = this.rssAppMonitor.getStatus();
      logger.info('DEBUG: 서버 상태', status);
    }, 5 * 60 * 1000); // 5분
  }
}

// 서버 시작
const server = new Server();
server.start(); 