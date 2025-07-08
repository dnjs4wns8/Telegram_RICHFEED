# RSS Monitor Service

소셜 미디어 게시글을 모니터링하고 텔레그램으로 전송하는 서비스입니다.

## 환경변수 설정

### 필수 환경변수

#### RSS.app 피드 URL
- `TWITTER_RSS_APP_FEED_URL`: 일론머스크 트위터 RSS.app 피드 URL
- `TRUTHSOCIAL_RSS_APP_FEED_URL`: 도널드 트럼프 트루스소셜 RSS.app 피드 URL

#### 텔레그램 설정
- `TELEGRAM_BOT_TOKEN`: 텔레그램 봇 토큰
- `TELEGRAM_CHAT_ID`: 텔레그램 채팅 ID

#### MySQL 데이터베이스 설정
- `DB_HOST`: MySQL 호스트 (기본값: localhost)
- `DB_PORT`: MySQL 포트 (기본값: 3306)
- `DB_USER`: MySQL 사용자명 (기본값: root)
- `DB_PASSWORD`: MySQL 비밀번호
- `DB_NAME`: MySQL 데이터베이스명 (기본값: rss_monitor)

### Railway 배포 시 환경변수 설정

1. Railway 대시보드에서 프로젝트 선택
2. "Variables" 탭에서 환경변수 추가
3. 위의 모든 환경변수를 설정

### 로컬 개발 시 환경변수 설정

`.env` 파일을 생성하고 다음 내용을 추가:

```env
# RSS.app 피드 URL
TWITTER_RSS_APP_FEED_URL=https://rss.app/feeds/v1.1/your-elon-feed-id.json
TRUTHSOCIAL_RSS_APP_FEED_URL=https://rss.app/feeds/v1.1/your-trump-feed-id.json

# 텔레그램 설정
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# MySQL 설정
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=rss_monitor
```

## 설치 및 실행

### 1. 패키지 설치
```bash
npm install
```

### 2. MySQL 패키지 설치
```bash
npm install mysql2 @types/mysql
```

### 3. 빌드
```bash
npm run build
```

### 4. 실행
```bash
npm start
```

## 기능

- RSS.app을 통한 소셜 미디어 모니터링
- MySQL을 통한 처리된 트윗 ID 영구 저장
- 텔레그램으로 번역된 메시지 전송
- 중복 메시지 방지
- 서버 재시작 후에도 처리 기록 유지

## 모니터링 대상

- 일론머스크 (트위터)
- 도널드 트럼프 (트루스소셜)

## 로그 확인

로그는 `logs/` 디렉토리에 저장됩니다:
- `combined.log`: 모든 로그
- `error.log`: 에러 로그만 