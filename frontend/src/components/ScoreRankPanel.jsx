import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

/**
 * 로펙 스타일: 환산 점수·랭킹
 * - 검색 캐릭터 점수 표시 (기존 OYO Power 연동 확장)
 * - 레벨 구간별 중앙값 / 티어컷
 * - (선택) 랭킹 테이블
 * 계산 로직은 utils/scoreRank.js 등에서 구현 후 연동
 */
export function ScoreRankPanel() {
  return (
    <Card className="oyo-panel">
      <CardHeader>
        <CardTitle>점수 · 랭킹</CardTitle>
        <CardDescription>
          환산 점수와 레벨 구간별 통계를 확인합니다. 캐릭터 검색 탭에서 조회한 캐릭터의 점수가 여기서도 활용됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted">준비 중입니다. 점수·중앙값·티어컷 계산을 연동할 예정입니다.</p>
      </CardContent>
    </Card>
  )
}
