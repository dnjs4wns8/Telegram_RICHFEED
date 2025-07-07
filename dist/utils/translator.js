"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Translator = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger");
class Translator {
    /**
     * MyMemory 번역 API 사용 (무료, 안정적)
     */
    async translateToKorean(text) {
        if (!text || text.trim() === '') {
            return text;
        }
        try {
            // MyMemory 번역 API 사용 (무료, 안정적)
            const response = await axios_1.default.get('https://api.mymemory.translated.net/get', {
                params: {
                    q: text,
                    langpair: 'en|ko'
                },
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            if (response.data && response.data.responseData && response.data.responseData.translatedText) {
                const translatedText = response.data.responseData.translatedText;
                logger_1.logger.info('DEBUG: 번역 성공 (MyMemory)', {
                    originalLength: text.length,
                    translatedLength: translatedText.length,
                    original: text.substring(0, 100) + '...',
                    translated: translatedText.substring(0, 100) + '...'
                });
                return translatedText;
            }
            logger_1.logger.warn('DEBUG: MyMemory 번역 실패, LibreTranslate 시도');
            return await this.translateWithLibreTranslate(text);
        }
        catch (error) {
            logger_1.logger.warn('DEBUG: MyMemory 번역 실패, LibreTranslate 시도', {
                error: error instanceof Error ? error.message : String(error)
            });
            return await this.translateWithLibreTranslate(text);
        }
    }
    /**
     * LibreTranslate 백업 번역
     */
    async translateWithLibreTranslate(text) {
        try {
            const response = await axios_1.default.post('https://libretranslate.de/translate', {
                q: text,
                source: 'en',
                target: 'ko',
                format: 'text'
            }, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.data && response.data.translatedText) {
                logger_1.logger.info('DEBUG: 번역 성공 (LibreTranslate)', {
                    originalLength: text.length,
                    translatedLength: response.data.translatedText.length
                });
                return response.data.translatedText;
            }
            return text; // 번역 실패 시 원본 반환
        }
        catch (error) {
            logger_1.logger.warn('DEBUG: LibreTranslate 번역도 실패, 원본 텍스트 사용', {
                error: error instanceof Error ? error.message : String(error)
            });
            return text; // 에러 시 원본 반환
        }
    }
    /**
     * 강제 번역 (언어 감지 없이)
     */
    async forceTranslate(text) {
        if (!text || text.trim() === '') {
            return text;
        }
        logger_1.logger.info('DEBUG: 강제 번역 시작', {
            text: text.substring(0, 100) + '...'
        });
        return await this.translateToKorean(text);
    }
    /**
     * 간단한 언어 감지 (영어인지 확인)
     */
    isEnglish(text) {
        // 영어 문자가 50% 이상인지 확인 (임계값 낮춤)
        const englishChars = text.match(/[a-zA-Z]/g)?.length || 0;
        const totalChars = text.replace(/\s/g, '').length;
        return totalChars > 0 && (englishChars / totalChars) > 0.5;
    }
    /**
     * 번역이 필요한지 확인하고 번역
     */
    async translateIfNeeded(text) {
        if (!text || text.trim() === '') {
            return text;
        }
        // 이미 한국어인지 확인 (간단한 체크)
        const koreanChars = text.match(/[가-힣]/g)?.length || 0;
        const totalChars = text.replace(/\s/g, '').length;
        // 한국어가 20% 이상이면 번역하지 않음 (임계값 낮춤)
        if (totalChars > 0 && (koreanChars / totalChars) > 0.2) {
            logger_1.logger.info('DEBUG: 이미 한국어로 판단되어 번역 건너뜀', {
                koreanRatio: (koreanChars / totalChars).toFixed(2),
                text: text.substring(0, 50) + '...'
            });
            return text;
        }
        // 영어인 경우에만 번역
        if (this.isEnglish(text)) {
            logger_1.logger.info('DEBUG: 영어 텍스트 감지, 번역 시작', {
                text: text.substring(0, 50) + '...'
            });
            return await this.translateToKorean(text);
        }
        logger_1.logger.info('DEBUG: 영어가 아닌 것으로 판단되어 번역 건너뜀', {
            text: text.substring(0, 50) + '...'
        });
        return text;
    }
    /**
     * HTML 콘텐츠에서 텍스트만 추출하여 번역
     */
    async translateHtmlContent(htmlContent) {
        if (!htmlContent || htmlContent.trim() === '') {
            return htmlContent;
        }
        try {
            // HTML 태그 제거하여 순수 텍스트 추출
            const plainText = htmlContent
                .replace(/<[^>]*>/g, ' ') // HTML 태그 제거
                .replace(/&nbsp;/g, ' ') // &nbsp; 제거
                .replace(/&amp;/g, '&') // &amp; 제거
                .replace(/&lt;/g, '<') // &lt; 제거
                .replace(/&gt;/g, '>') // &gt; 제거
                .replace(/&quot;/g, '"') // &quot; 제거
                .replace(/&#39;/g, "'") // &#39; 제거
                .replace(/\s+/g, ' ') // 연속 공백을 하나로
                .trim();
            logger_1.logger.info('DEBUG: HTML 콘텐츠에서 텍스트 추출', {
                originalLength: htmlContent.length,
                plainTextLength: plainText.length,
                plainText: plainText.substring(0, 100) + '...'
            });
            // 강제 번역 실행
            const translatedText = await this.forceTranslate(plainText);
            return translatedText;
        }
        catch (error) {
            logger_1.logger.warn('DEBUG: HTML 콘텐츠 번역 실패', {
                error: error instanceof Error ? error.message : String(error)
            });
            return htmlContent; // 에러 시 원본 반환
        }
    }
}
exports.Translator = Translator;
//# sourceMappingURL=translator.js.map