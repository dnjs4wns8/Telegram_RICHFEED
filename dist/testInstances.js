"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const instanceTester_1 = require("./utils/instanceTester");
const logger_1 = require("./utils/logger");
async function main() {
    try {
        // 로그 디렉토리 생성
        (0, logger_1.ensureLogDirectory)();
        logger_1.logger.info('DEBUG: Nitter 인스턴스 테스트 프로그램 시작');
        // 모든 인스턴스 테스트
        await instanceTester_1.InstanceTester.testAllInstances();
        // 작동하는 인스턴스만 가져오기
        const workingInstances = await instanceTester_1.InstanceTester.getWorkingInstances();
        logger_1.logger.info('DEBUG: 작동하는 인스턴스 목록', {
            count: workingInstances.length,
            instances: workingInstances
        });
        if (workingInstances.length > 0) {
            console.log('\n=== 작동하는 Nitter 인스턴스 ===');
            workingInstances.forEach((instance, index) => {
                console.log(`${index + 1}. ${instance}`);
            });
            console.log('\n이 인스턴스들을 config/index.ts에 추가하세요.');
        }
        else {
            console.log('\n❌ 작동하는 Nitter 인스턴스가 없습니다.');
            console.log('다른 방법을 고려해보세요.');
        }
    }
    catch (error) {
        logger_1.logger.error('DEBUG: 테스트 중 오류 발생', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
// 스크립트 실행
main();
//# sourceMappingURL=testInstances.js.map