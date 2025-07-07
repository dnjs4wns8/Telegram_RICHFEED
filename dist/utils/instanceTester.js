"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstanceTester = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger");
const config_1 = require("../config");
class InstanceTester {
    /**
     * 모든 Nitter 인스턴스 테스트
     */
    static async testAllInstances() {
        logger_1.logger.info('DEBUG: Nitter 인스턴스 테스트 시작');
        const results = [];
        for (const instance of config_1.config.nitterInstances) {
            const result = await this.testInstance(instance);
            results.push(result);
            // 결과 로깅
            if (result.status === 'success') {
                logger_1.logger.info('DEBUG: 인스턴스 테스트 성공', {
                    instance: result.instance,
                    responseTime: result.responseTime
                });
            }
            else {
                logger_1.logger.warn('DEBUG: 인스턴스 테스트 실패', {
                    instance: result.instance,
                    error: result.error
                });
            }
        }
        // 결과 요약
        const successfulInstances = results.filter(r => r.status === 'success');
        const failedInstances = results.filter(r => r.status === 'failed');
        logger_1.logger.info('DEBUG: 인스턴스 테스트 완료', {
            total: results.length,
            successful: successfulInstances.length,
            failed: failedInstances.length,
            successfulInstances: successfulInstances.map(r => r.instance),
            failedInstances: failedInstances.map(r => ({ instance: r.instance, error: r.error }))
        });
    }
    /**
     * 단일 인스턴스 테스트
     */
    static async testInstance(instance) {
        const startTime = Date.now();
        const testUrl = `${instance}/elonmusk/rss`;
        try {
            const response = await axios_1.default.get(testUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
                },
                validateStatus: (status) => status >= 200 && status < 300
            });
            const responseTime = Date.now() - startTime;
            // 응답 내용 확인
            const contentLength = response.data.length;
            const hasRSSContent = typeof response.data === 'string' &&
                (response.data.includes('<rss') || response.data.includes('<feed'));
            if (contentLength > 0 && hasRSSContent) {
                return {
                    instance,
                    status: 'success',
                    responseTime
                };
            }
            else {
                return {
                    instance,
                    status: 'failed',
                    error: '빈 응답 또는 RSS 형식이 아님'
                };
            }
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                instance,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
                responseTime
            };
        }
    }
    /**
     * 작동하는 인스턴스만 반환
     */
    static async getWorkingInstances() {
        const results = [];
        for (const instance of config_1.config.nitterInstances) {
            const result = await this.testInstance(instance);
            results.push(result);
        }
        return results
            .filter(r => r.status === 'success')
            .sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0))
            .map(r => r.instance);
    }
}
exports.InstanceTester = InstanceTester;
//# sourceMappingURL=instanceTester.js.map