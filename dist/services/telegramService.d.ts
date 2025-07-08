import { Tweet, RSSAppFeedItem } from '../types';
export declare class TelegramService {
    private bot?;
    private translator;
    constructor();
    sendTweet(tweet: Tweet, accountName: string, originalItem?: RSSAppFeedItem): Promise<void>;
    /**
     * 재시도 로직을 포함한 메시지 전송
     */
    private sendMessageWithRetry;
    /**
     * 429 에러에서 retry_after 값 추출
     */
    private extractRetryAfter;
    private formatTweetMessage;
    private cleanHtmlContent;
    isEnabled(): boolean;
}
//# sourceMappingURL=telegramService.d.ts.map