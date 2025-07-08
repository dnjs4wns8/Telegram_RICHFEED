import winston from 'winston';
import path from 'path';

// Railway 환경 감지
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.RAILWAY_PROJECT_ID;

// 로그 포맷 정의
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 콘솔 포맷 (개발용)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// Railway용 콘솔 포맷 (JSON 형태로 구조화)
const railwayConsoleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 로거 생성
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'rss-monitor' },
  transports: []
});

// Railway 환경에서는 콘솔 로깅만 사용
if (isRailway) {
  logger.add(new winston.transports.Console({
    format: railwayConsoleFormat
  }));
} else {
  // 로컬 환경에서는 파일 로깅 + 콘솔 출력
  const logDir = path.join(process.cwd(), 'logs');
  
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  // 개발 환경에서는 콘솔에도 출력
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 로그 디렉토리 생성 함수 (로컬 환경에서만 사용)
export const ensureLogDirectory = (): void => {
  if (!isRailway) {
    const fs = require('fs');
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
}; 