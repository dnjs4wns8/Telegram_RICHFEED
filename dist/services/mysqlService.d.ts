export declare class MySQLService {
    private pool;
    constructor();
    /**
     * 데이터베이스 초기화 (테이블 생성)
     */
    initializeDatabase(): Promise<void>;
    /**
     * 처리된 트윗 ID 저장
     */
    saveProcessedTweet(accountName: string, tweetId: string, platform: string): Promise<void>;
    /**
     * 처리된 트윗 ID 목록 조회
     */
    getProcessedTweetIds(accountName: string): Promise<Set<string>>;
    /**
     * 모든 계정의 처리된 트윗 ID 목록 조회
     */
    getAllProcessedTweetIds(): Promise<Map<string, Set<string>>>;
    /**
     * 데이터베이스 연결 테스트
     */
    testConnection(): Promise<boolean>;
    /**
     * 연결 풀 종료
     */
    close(): Promise<void>;
}
//# sourceMappingURL=mysqlService.d.ts.map