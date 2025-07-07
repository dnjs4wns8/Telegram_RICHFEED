import { Tweet, RSSAppFeedItem } from '../types';
export declare class TelegramService {
    private bot?;
    private translator;
    constructor();
    sendTweet(tweet: Tweet, accountName: string, originalItem?: RSSAppFeedItem): Promise<void>;
    private formatTweetMessage;
    private cleanHtmlContent;
    isEnabled(): boolean;
}
//# sourceMappingURL=telegramService.d.ts.map