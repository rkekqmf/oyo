# OYO

로스트아크 캐릭터 정보 조회 서비스입니다.  
포트폴리오를 목적으로, 프론트/백엔드를 분리해 실제 배포 형태로 구성했습니다.

## Live

- Frontend (Cloudflare Pages): `https://<your-pages-domain>` (배포 URL로 교체 필요)
- Backend API (Cloudflare Workers): `https://backend.rkekqmf.workers.dev`

## 프로젝트 구조

```txt
oyo/
  frontend/  # React + Vite
  backend/   # Cloudflare Workers + Hono
```

## 기술 스택

- Frontend: React, Vite
- Backend: Cloudflare Workers, Hono
- Infra/Deploy: Cloudflare Pages, Cloudflare Workers
- API: Lost Ark Open API

## 핵심 기능

- 캐릭터 검색
- 최근 검색어(localStorage)
- 즐겨찾기(localStorage)
- 캐릭터 상세 모달(장비/각인/보석)
- 보스 준비도 체크
- 캐릭터 비교
- 경매장 가격 스냅샷 저장 및 기간별 추이 조회(D1)

## 아키텍처

- 사용자는 **Pages**에 배포된 프론트엔드에 접속합니다.
- 프론트엔드는 **Workers** API를 호출합니다.
- Workers가 Lost Ark Open API를 서버 사이드에서 호출하고 결과를 가공해 전달합니다.
- 민감 정보(API 토큰)는 Workers secret/.dev.vars로 관리합니다.

## 왜 프론트/백엔드를 분리했는가

- 실제 서비스와 유사한 배포 구조를 경험하기 위해
- API 토큰 보호(클라이언트 노출 방지)
- 역할 분리로 유지보수/확장성을 높이기 위해

## 로컬 실행

### 1) Backend

`backend/.dev.vars`:

```env
LOSTARK_API_TOKEN=your_token
```

실행:

```bash
cd backend
npm install
npm run dev
```

### 2) Frontend

`frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8787
```

실행:

```bash
cd frontend
npm install
npm run dev
```

## 배포

배포 상세 절차는 `DEPLOYMENT.md`를 참고하세요.
코드 구조/파일 책임은 `PROJECT_MAP.md`를 참고하세요.
기능 테스트 절차는 `TEST_CASES.md`를 참고하세요.

요약:

1. Workers에 backend 배포
2. Pages에 frontend 배포
3. Pages 환경변수 `VITE_API_BASE_URL`에 Worker URL 설정

## 트러블슈팅

### 1) Cloudflare 522

- 원인: Pages/도메인/DNS 또는 API URL 설정 이슈
- 해결:
  - Pages 환경변수 `VITE_API_BASE_URL` 확인
  - Worker URL로 `/api/health` 직접 점검
  - 커스텀 도메인 DNS 설정 확인

### 2) backend 폴더가 GitHub에서 화살표(서브모듈)로 보임

- 원인: `backend/.git`가 남아 서브모듈로 인식됨
- 해결:
  - `backend/.git` 제거
  - 루트 저장소에서 `backend`를 일반 디렉터리로 다시 add/commit/push

## 향후 계획

- 간편 로그인(OAuth) 모듈화
- 최근 검색/즐겨찾기 서버 DB 저장 전환
- 캐시/모니터링/성능 개선
