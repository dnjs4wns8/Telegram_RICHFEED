export declare class Translator {
    /**
     * MyMemory 번역 API 사용 (무료, 안정적)
     */
    translateToKorean(text: string): Promise<string>;
    /**
     * LibreTranslate 백업 번역
     */
    private translateWithLibreTranslate;
    /**
     * 강제 번역 (언어 감지 없이)
     */
    forceTranslate(text: string): Promise<string>;
    /**
     * 간단한 언어 감지 (영어인지 확인)
     */
    private isEnglish;
    /**
     * 번역이 필요한지 확인하고 번역
     */
    translateIfNeeded(text: string): Promise<string>;
    /**
     * HTML 콘텐츠에서 텍스트만 추출하여 번역
     */
    translateHtmlContent(htmlContent: string): Promise<string>;
}
//# sourceMappingURL=translator.d.ts.map