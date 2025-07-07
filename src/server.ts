import { RSSAppMonitorService } from './services/rssAppMonitor';
import { logger, ensureLogDirectory } from './utils/logger';

class Server {
  private rssAppMonitor: RSSAppMonitorService;

  constructor() {
    this.rssAppMonitor = new RSSAppMonitorService();
  }

  public start(): void {
    try {
      // 로그 디렉토리 생성
      ensureLogDirectory();

      logger.info('DEBUG: RSS.app 다중 계정 모니터링 서버를 시작합니다');

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

  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      logger.info('DEBUG: 서버 종료 시그널 수신', { signal });
      
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