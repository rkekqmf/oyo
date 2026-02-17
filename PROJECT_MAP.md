# OYO Project Map

지금 코드를 빠르게 이해하고 유지보수하기 위한 정리 문서입니다.

## 지금 바로 할 일 (정리 체크리스트)

- [ ] `README.md`의 Frontend Live URL 실제 주소로 교체
- [ ] `README.md`의 기능 설명이 현재 코드와 일치하는지 최종 점검
- [ ] `DEPLOYMENT.md`의 Worker URL 예시를 실제 계정 기준으로 업데이트
- [ ] 브라우저 수동 QA 1회 수행
  - [ ] 검색 -> 결과 렌더
  - [ ] 카드 클릭 -> 상세 모달 탭 전환
  - [ ] 즐겨찾기 토글 저장/복원
  - [ ] 최근 검색 저장/삭제
- [ ] `frontend/README.md`가 불필요하면 삭제하거나 루트 README로 링크 통일

## 파일별 책임표

### 루트

- `README.md`
  - 프로젝트 개요, 로컬 실행, 배포 개요, 트러블슈팅
- `DEPLOYMENT.md`
  - Cloudflare Workers/Pages 배포 절차
- `PROJECT_MAP.md`
  - 현재 문서. 구조 이해/유지보수 참고

### Frontend (`frontend/`)

- `package.json`
  - 프론트 실행/빌드/lint 스크립트
- `.env` / `.env.example`
  - `VITE_API_BASE_URL` 관리
- `src/main.jsx`
  - React 엔트리포인트
- `src/App.jsx`
  - 화면 조립, 상위 상태 연결, 상세 모달 열기/닫기 흐름
- `src/services/lostarkApi.js`
  - 백엔드 API 호출 함수 모음 (`fetchCharacterSiblings`, `fetchCharacterArmory`, `fetchMarketHistory`, `createMarketSnapshot`)
- `src/hooks/useCharacterSearch.js`
  - 검색/로딩/에러/최근검색 상태 로직
- `src/hooks/useFavorites.js`
  - 즐겨찾기 상태 로직(localStorage)
- `src/components/AuctionMarketPanel.jsx`
  - 경매장 가격 스냅샷 저장/기간 조회/라인 차트 UI
- `src/components/CharacterSearchForm.jsx`
  - 검색 입력 UI
- `src/components/RecentSearches.jsx`
  - 최근 검색 UI
- `src/components/FavoriteCharacters.jsx`
  - 즐겨찾기 섹션 UI
- `src/components/CharacterResult.jsx`
  - 검색 결과 섹션 UI
- `src/components/CharacterCard.jsx`
  - 캐릭터 카드 UI, 즐겨찾기 버튼, 카드 클릭 처리
- `src/components/CharacterDetailModal.jsx`
  - 상세 모달 UI, 탭(장비/각인/보석)
- `src/utils/engraving.js`
  - 각인 데이터 파싱 유틸 (`Effects`, `ArkPassiveEffects`, `Engravings`)
- `src/utils/characterCompare.js`
  - 캐릭터 비교용 지표 계산 유틸
- `src/utils/bossReadiness.js`
  - 보스 준비도 점검 계산 유틸
- `src/App.css`, `src/index.css`
  - 앱 스타일

### Backend (`backend/`)

- `package.json`
  - Worker dev/deploy 스크립트
- `wrangler.jsonc`
  - Worker 런타임/엔트리 설정
- `.dev.vars` / `.dev.vars.example`
  - `LOSTARK_API_TOKEN`, `AUCTION_WATCH_ITEMS` 로컬/예시
- `src/index.ts`
  - Hono 서버 엔트리 + 모든 API 라우트
  - `GET /api/health`: 헬스체크
  - `GET /api/lostark/characters/:name`: 캐릭터 형제 목록
  - `GET /api/lostark/armories/:name`: 프로필/장비/각인/보석 상세
  - `POST /api/market/snapshot`: 아이템 현재가 스냅샷 저장
  - `POST /api/market/snapshot/batch`: 감시 아이템 일괄 수집
  - `GET /api/market/history`: 기간별 가격 이력 조회
- `migrations/0001_price_snapshots.sql`
  - 경매장 시계열 테이블 생성

## 수정할 때 어디를 건드리면 되는가

- 검색 UX(엔터/검증/상태): `frontend/src/hooks/useCharacterSearch.js`
- API 응답 가공/에러 메시지: `frontend/src/services/lostarkApi.js`
- 결과 카드 UI: `frontend/src/components/CharacterCard.jsx`
- 상세 탭 종류 변경: `frontend/src/components/CharacterDetailModal.jsx`
- 신규 API 라우트 추가: `backend/src/index.ts`
- 배포 설정 변경: `backend/wrangler.jsonc`, Cloudflare Pages 환경변수
