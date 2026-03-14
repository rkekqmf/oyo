import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

/**
 * LOALAB 스타일: 전투·계산
 * - 치명타 확률 (캐릭터 연동 또는 수동 입력)
 * - 재련 비용/확률 (일반·상급)
 * - 경매 계산기, 음돌 등 (서브 메뉴 또는 섹션)
 * 계산 로직은 utils/combatCalc.js 등에서 구현 후 연동
 */
export function CombatCalcPanel() {
  return (
    <Card className="oyo-panel">
      <CardHeader>
        <CardTitle>전투 · 계산</CardTitle>
        <CardDescription>
          치명타 확률, 재련, 경매 낙찰 등 전투·강화 관련 계산기를 제공합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted">준비 중입니다. 치명타·재련·경매 계산을 연동할 예정입니다.</p>
      </CardContent>
    </Card>
  )
}
