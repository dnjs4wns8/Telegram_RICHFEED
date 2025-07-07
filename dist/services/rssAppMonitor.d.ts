export declare class RSSAppMonitorService {
    private processedTweets;
    private lastCheckTime;
    private telegramService;
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
}
//# sourceMappingURL=rssAppMonitor.d.ts.map