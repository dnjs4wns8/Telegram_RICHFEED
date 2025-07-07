export declare class InstanceTester {
    /**
     * 모든 Nitter 인스턴스 테스트
     */
    static testAllInstances(): Promise<void>;
    /**
     * 단일 인스턴스 테스트
     */
    private static testInstance;
    /**
     * 작동하는 인스턴스만 반환
     */
    static getWorkingInstances(): Promise<string[]>;
}
//# sourceMappingURL=instanceTester.d.ts.map