"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureLogDirectory = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Railway 환경 감지
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.RAILWAY_PROJECT_ID;
// 로그 포맷 정의
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// 콘솔 포맷 (개발용)
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({
    format: 'HH:mm:ss'
}), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
}));
// Railway용 콘솔 포맷 (JSON 형태로 구조화)
const railwayConsoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// 로거 생성
exports.logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    defaultMeta: { service: 'rss-monitor' },
    transports: []
});
// Railway 환경에서는 콘솔 로깅만 사용
if (isRailway) {
    exports.logger.add(new winston_1.default.transports.Console({
        format: railwayConsoleFormat
    }));
}
else {
    // 로컬 환경에서는 파일 로깅 + 콘솔 출력
    const logDir = path_1.default.join(process.cwd(), 'logs');
    exports.logger.add(new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }));
    exports.logger.add(new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }));
    // 개발 환경에서는 콘솔에도 출력
    exports.logger.add(new winston_1.default.transports.Console({
        format: consoleFormat
    }));
}
// 로그 디렉토리 생성 함수 (로컬 환경에서만 사용)
const ensureLogDirectory = () => {
    if (!isRailway) {
        const fs = require('fs');
        const logDir = path_1.default.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
};
exports.ensureLogDirectory = ensureLogDirectory;
//# sourceMappingURL=logger.js.map