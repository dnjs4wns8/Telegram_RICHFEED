export declare class RSSMonitorService {
    private parser;
    private processedTweets;
    private lastCheckTime;
    constructor();
    /**
     * 모니터링 시작
     */
    startMonitoring(): void;
    /**
     * 새 트윗 확인
     */
    private checkForNewTweets;
    /**
     * RSS 피드에서 트윗 가져오기
     */
    private fetchTweets;
    /**
     * 다른 Nitter 인스턴스로 재시도
     */
    private retryWithOtherInstances;
    /**
     * RSS 아이템을 Tweet 객체로 변환
     */
    private parseTweetItem;
    /**
     * 트윗 URL에서 ID 추출
     */
    private extractTweetId;
    /**
     * 새 트윗 처리
     */
    private processNewTweet;
    /**
     * 지연 함수
     */
    private delay;
    /**
     * 모니터링 상태 조회
     */
    getStatus(): object;
}
//# sourceMappingURL=rssMonitor.d.ts.map