"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const logger_1 = require("../utils/logger");
const translator_1 = require("../utils/translator");
class TelegramService {
    constructor() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        this.translator = new translator_1.Translator();
        if (!token || !chatId) {
            logger_1.logger.warn('DEBUG: 텔레그램 설정이 누락되었습니다. 텔레그램 전송이 비활성화됩니다.');
            return;
        }
        this.bot = new node_telegram_bot_api_1.default(token, { polling: false });
        logger_1.logger.info('DEBUG: 텔레그램 서비스가 초기화되었습니다');
    }
    async sendTweet(tweet, accountName, originalItem) {
        if (!this.bot) {
            logger_1.logger.warn('DEBUG: 텔레그램 봇이 초기화되지 않았습니다');
            return;
        }
        try {
            logger_1.logger.info('DEBUG: 번역 시작', {
                tweetId: tweet.id,
                originalTitle: tweet.title,
                originalContentLength: tweet.content.length,
                originalContent: tweet.content.substring(0, 100) + '...'
            });
            // 콘텐츠 번역 (강제 번역)
            const translatedContent = await this.translator.translateHtmlContent(tweet.content);
            const translatedTitle = await this.translator.translateIfNeeded(tweet.title);
            logger_1.logger.info('DEBUG: 번역 완료', {
                tweetId: tweet.id,
                originalTitle: tweet.title,
                translatedTitle: translatedTitle,
                originalContentLength: tweet.content.length,
                translatedContentLength: translatedContent.length,
                translatedContent: translatedContent.substring(0, 100) + '...'
            });
            // 번역된 콘텐츠로 메시지 생성
            const message = this.formatTweetMessage({
                ...tweet,
                title: translatedTitle,
                content: translatedContent
            }, accountName);
            // 이미지가 있는 경우 이미지와 함께 메시지 전송
            if (originalItem?.image) {
                await this.bot.sendPhoto(process.env.TELEGRAM_CHAT_ID, originalItem.image, {
                    caption: message,
                    parse_mode: 'HTML'
                });
                logger_1.logger.info('DEBUG: 텔레그램 이미지 메시지 전송 성공', {
                    tweetId: tweet.id,
                    accountName: accountName,
                    hasImage: true,
                    translated: true
                });
            }
            else {
                // 텍스트만 전송
                await this.bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: false
                });
                logger_1.logger.info('DEBUG: 텔레그램 텍스트 메시지 전송 성공', {
                    tweetId: tweet.id,
                    accountName: accountName,
                    hasImage: false,
                    translated: true
                });
            }
        }
        catch (error) {
            logger_1.logger.error('DEBUG: 텔레그램 메시지 전송 실패', {
                tweetId: tweet.id,
                accountName: accountName,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    formatTweetMessage(tweet, accountName) {
        const platform = tweet.platform === 'twitter' ? '🐦 트위터' : '🔴 트루스소셜';
        // 번역된 콘텐츠 사용
        const content = tweet.content.length > 3000
            ? tweet.content.substring(0, 3000) + '...'
            : tweet.content;
        // HTML 태그 정리 (텔레그램에서 지원하는 태그만 사용)
        const cleanContent = this.cleanHtmlContent(content);
        return `
<b>${platform} - ${accountName}</b>

📝 <b>${tweet.title}</b>

${cleanContent}

🔗 <a href="${tweet.link}">원문 보기</a>

⏰ ${tweet.publishedAt.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })}
    `.trim();
    }
    cleanHtmlContent(content) {
        // HTML 태그를 텔레그램에서 지원하는 형태로 변환
        return content
            .replace(/<br\s*\/?>/gi, '\n') // <br> 태그를 줄바꿈으로
            .replace(/<p>/gi, '') // <p> 시작 태그 제거
            .replace(/<\/p>/gi, '\n\n') // <p> 끝 태그를 이중 줄바꿈으로
            .replace(/<[^>]*>/g, '') // 기타 HTML 태그 제거
            .replace(/&nbsp;/g, ' ') // &nbsp;를 공백으로
            .replace(/&amp;/g, '&') // &amp;를 &로
            .replace(/&lt;/g, '<') // &lt;를 <로
            .replace(/&gt;/g, '>') // &gt;를 >로
            .replace(/&quot;/g, '"') // &quot;를 "로
            .replace(/&#39;/g, "'") // &#39;를 '로
            .trim();
    }
    isEnabled() {
        return !!this.bot;
    }
}
exports.TelegramService = TelegramService;
//# sourceMappingURL=telegramService.js.map