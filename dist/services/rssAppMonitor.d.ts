export declare class RSSAppMonitorService {
    private processedTweets;
    private lastCheckTime;
    private telegramService;
    private dataDir;
    private processedTweetsFile;
    constructor();
    /**
     * 모니터링 시작
     */
    startMonitoring(): void;
    /**
     * 모든 계정 확인
     */
    private checkAllAccounts;
    /**
     * 특정 계정 확인
     */
    private checkAccount;
    /**
     * RSS.app에서 트윗 가져오기
     */
    private fetchTweets;
    /**
     * RSS.app 아이템을 Tweet 객체로 변환
     */
    private parseRSSAppItem;
    /**
     * 트윗 URL에서 ID 추출
     */
    private extractTweetId;
    /**
     * 새 트윗 처리
     */
    private processNewTweet;
    /**
     * 모니터링 상태 조회
     */
    getStatus(): object;
    /**
     * 데이터 디렉토리 생성
     */
    private ensureDataDirectory;
    /**
     * 처리된 트윗 로드
     */
    private loadProcessedTweets;
    /**
     * 처리된 트윗 저장
     *
     * 향후 개선 방안:
     * - Railway PostgreSQL 사용
     * - MongoDB Atlas 사용
     * - Redis 사용
     * - Supabase 사용
     */
    private saveProcessedTweets;
}
//# sourceMappingURL=rssAppMonitor.d.ts.map