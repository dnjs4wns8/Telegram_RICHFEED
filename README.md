# RSS 모니터링 서비스 (RSS.app 사용)

트위터와 트루스소셜 RSS 피드를 통해 일론머스크와 도널드 트럼프의 새 게시글을 1분 간격으로 모니터링하는 Node.js 서비스입니다. RSS.app을 사용하여 안정적인 RSS 피드를 제공받습니다.

## 🚀 Railway 자동 배포

### 1. GitHub 저장소 준비
```bash
# 현재 변경사항을 GitHub에 푸시
git add .
git commit -m "Railway 배포 준비"
git push origin main
```

### 2. Railway 프로젝트 생성
1. **Railway 대시보드 접속**: https://railway.app/
2. **"New Project" 클릭**
3. **"Deploy from GitHub repo" 선택**
4. **GitHub 저장소 연결**: `inflsnsmonitoring` 저장소 선택
5. **"Deploy Now" 클릭**

### 3. 환경변수 설정
Railway 대시보드에서 다음 환경변수들을 설정하세요:

- `RSS_APP_FEED_URL_ELON`: 일론머스크 RSS 피드 URL
- `RSS_APP_FEED_URL_TRUMP`: 트럼프 RSS 피드 URL  
- `RSS_APP_FEED_URL_MARKET`: 마켓리딩 RSS 피드 URL
- `TELEGRAM_BOT_TOKEN`: 텔레그램 봇 토큰
- `TELEGRAM_CHAT_ID`: 텔레그램 채널 ID

### 4. 자동 배포 확인
- GitHub에 코드를 푸시하면 자동으로 Railway에 배포됩니다
- Railway 대시보드에서 배포 상태를 확인할 수 있습니다

## 기능

- 🕐 **1분 간격 모니터링**: RSS.app 피드를 주기적으로 확인
- 👥 **다중 계정 지원**: 트위터와 트루스소셜 동시 모니터링
- 📝 **상세한 로깅**: 모든 요청과 새 게시글 발견을 로그로 기록
- 🛡️ **에러 처리**: 재시도 로직과 에러 복구 기능
- 🚀 **TypeScript**: 타입 안전성 보장
- 🔗 **RSS.app 통합**: 안정적인 RSS 피드 제공

## 모니터링 대상

- **일론머스크 (트위터)**: `@Elonmusk`
- **도널드 트럼프 (트루스소셜)**: `@realDonaldTrump`

## RSS.app 설정

### 1. RSS.app에서 피드 생성

#### 트위터 피드 생성
1. **RSS.app 웹사이트 접속**: https://rss.app/
2. **트위터 URL 입력**: `https://twitter.com/Elonmusk`
3. **피드 생성**: 자동으로 RSS 피드 URL 생성
4. **피드 URL 복사**: 생성된 JSON 피드 URL 복사

#### 트루스소셜 피드 생성
1. **RSS.app 웹사이트 접속**: https://rss.app/
2. **트루스소셜 URL 입력**: `https://truthsocial.com/@realDonaldTrump`
3. **피드 생성**: 자동으로 RSS 피드 URL 생성
4. **피드 URL 복사**: 생성된 JSON 피드 URL 복사

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# RSS.app 설정
TWITTER_RSS_APP_FEED_URL=https://rss.app/feeds/v1.1/your-twitter-feed-id.json
TRUTHSOCIAL_RSS_APP_FEED_URL=https://rss.app/feeds/v1.1/your-truthsocial-feed-id.json

# 서버 설정
NODE_ENV=development
LOG_LEVEL=debug
```

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 실제 RSS.app 피드 URL 입력
```

### 3. 개발 모드 실행
```bash
npm run dev
```

### 4. 프로덕션 빌드 및 실행
```bash
npm run build
npm start
```

## 프로젝트 구조

```
src/
├── config/
│   └── index.ts          # 모니터링 설정 (다중 계정)
├── services/
│   ├── rssAppMonitor.ts  # RSS.app 다중 계정 모니터링 서비스
│   └── rssMonitor.ts     # 기존 Nitter RSS 모니터링
├── types/
│   └── index.ts          # TypeScript 타입 정의
├── utils/
│   ├── logger.ts         # 로깅 시스템
│   └── instanceTester.ts # Nitter 인스턴스 테스트
├── testInstances.ts      # 인스턴스 테스트 스크립트
└── server.ts             # 메인 서버 파일
```

## 설정

`src/config/index.ts`에서 다음 설정을 변경할 수 있습니다:

```typescript
export const config: MonitoringConfig = {
  accounts: [
    {
      name: 'Elonmusk',
      platform: 'twitter',
      rssAppFeedUrl: 'your-twitter-feed-url',
      displayName: '일론머스크 (트위터)'
    },
    {
      name: 'realDonaldTrump',
      platform: 'truthsocial',
      rssAppFeedUrl: 'your-truthsocial-feed-url',
      displayName: '도널드 트럼프 (트루스소셜)'
    }
  ],
  checkInterval: 60000,             // 체크 간격 (1분)
  maxRetries: 3,                    // 최대 재시도 횟수
  retryDelay: 5000                  // 재시도 간격 (5초)
};
```

## 로그

로그는 `logs/` 디렉토리에 저장됩니다:

- `combined.log`: 모든 로그
- `error.log`: 에러 로그만

로그 예시:
```
2024-01-15 10:30:00 [INFO]: DEBUG: RSS.app 다중 계정 모니터링 서비스를 시작합니다
2024-01-15 10:30:00 [INFO]: DEBUG: 모든 계정 RSS.app 피드 확인 시작
2024-01-15 10:30:02 [INFO]: DEBUG: 계정 확인 시작 {"account":"일론머스크 (트위터)","platform":"twitter"}
2024-01-15 10:30:02 [INFO]: DEBUG: 계정 확인 시작 {"account":"도널드 트럼프 (트루스소셜)","platform":"truthsocial"}
2024-01-15 10:30:05 [INFO]: DEBUG: 새 트윗 발견 {"account":"일론머스크 (트위터)","count":1}
```

## 모니터링되는 데이터

새 게시글이 발견되면 다음 정보가 로그에 기록됩니다:

- 계정명 및 플랫폼
- 게시글 ID
- 제목
- 내용
- 링크
- 게시 시간
- 작성자

## RSS.app 장점

- **안정성**: 전문 RSS 서비스로 안정적인 피드 제공
- **실시간 업데이트**: 소셜미디어 변경사항에 빠른 대응
- **API 지원**: JSON 형태로 구조화된 데이터 제공
- **무료 플랜**: 기본 사용은 무료
- **다중 플랫폼**: 트위터, 트루스소셜 등 다양한 플랫폼 지원

## 환경 변수

- `TWITTER_RSS_APP_FEED_URL`: 트위터 RSS.app 피드 URL (필수)
- `TRUTHSOCIAL_RSS_APP_FEED_URL`: 트루스소셜 RSS.app 피드 URL (필수)
- `NODE_ENV`: 실행 환경 (development/production)
- `LOG_LEVEL`: 로그 레벨 (debug/info/warn/error)

## 라이선스

MIT License 