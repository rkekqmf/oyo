# OYO Deployment Guide (Cloudflare)

이 문서는 `frontend(React)` + `backend(Workers)`를 Cloudflare에 배포하는 최소 절차입니다.

## 1) 사전 준비

- Cloudflare 계정 생성
- `npm install -g wrangler` 또는 `npx wrangler` 사용
- CLI 로그인:

```bash
wrangler login
```

## 2) Backend 배포 (Cloudflare Workers)

`backend` 디렉터리에서 실행:

```bash
npm install
wrangler d1 create oyo-db
wrangler d1 migrations apply oyo-db --local
wrangler d1 migrations apply oyo-db --remote
wrangler secret put LOSTARK_API_TOKEN
npm run deploy
```

배포가 끝나면 Worker URL을 확인합니다. 예: `https://backend.<account>.workers.dev`

추가 환경 변수(선택):

- `AUCTION_WATCH_ITEMS=50010|정제된 파괴강석,50010|파괴강석,50010|태양의 가호`
  - cron 수집 대상 목록(쉼표 구분)
  - 권장 형식: `카테고리코드|아이템명`
  - 설정 위치:
    - 로컬: `backend/.dev.vars`
    - 배포: Cloudflare Dashboard > Workers > backend > Settings > Variables

주의:

- `wrangler d1 create` 실행 후 출력되는 `database_id` 값을
  `backend/wrangler.jsonc`의 `d1_databases[0].database_id`에 반영해야 합니다.

## 3) Frontend 배포 (Cloudflare Pages)

Cloudflare Dashboard > Pages > Create Project > Git 연동(또는 Direct Upload)

빌드 설정:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `frontend`

환경 변수 설정:

- `VITE_API_BASE_URL=https://<배포된-worker-도메인>`

예:

- `VITE_API_BASE_URL=https://backend.<account>.workers.dev`

## 4) CORS 확인

현재 backend는 `cors()` 기본 설정이라 호출 허용 범위가 넓습니다.
운영에서는 특정 도메인만 허용하도록 제한하는 것을 권장합니다.

## 5) 배포 후 점검

- Frontend에서 캐릭터 검색 정상 동작
- 상세 모달(장비/각인/보석) 호출 정상 동작
- 즐겨찾기/최근검색 브라우저 저장 정상 동작
- Browser devtools network에서 `4xx/5xx` 확인
