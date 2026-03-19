import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useMemo, useState } from 'react'

/**
 * LOALAB 스타일: 전투·계산
 * - 치명타 확률 (캐릭터 연동 또는 수동 입력)
 * - 재련 비용/확률 (일반·상급)
 * - 경매 계산기, 음돌 등 (서브 메뉴 또는 섹션)
 * 계산 로직은 utils/combatCalc.js 등에서 구현 후 연동
 */
export function CombatCalcPanel() {
  const [characterName, setCharacterName] = useState('')
  const [critStat, setCritStat] = useState(523)
  const [petBonus, setPetBonus] = useState(true)
  const [braceletBonus, setBraceletBonus] = useState(false)
  const [adrenalineLevel, setAdrenalineLevel] = useState(4)
  const [synergyLevel, setSynergyLevel] = useState('none')
  const [tripodLevel, setTripodLevel] = useState('none')

  const calc = useMemo(() => {
    const safeCrit = Number.isFinite(Number(critStat)) ? Math.max(0, Number(critStat)) : 0
    const baseCritRate = safeCrit / 27.9
    const petRate = petBonus ? 10 : 0
    const braceletRate = braceletBonus ? 10 : 0
    const adrenalineRate = adrenalineLevel * 5
    const synergyRate = synergyLevel === 'high' ? 2.1 : synergyLevel === 'mid' ? 1.8 : synergyLevel === 'low' ? 1.5 : 0
    const tripodRate = tripodLevel === 'lv5' ? 45 : tripodLevel === 'lv4' ? 30 : tripodLevel === 'lv3' ? 15 : 0

    const total = baseCritRate + petRate + braceletRate + adrenalineRate + synergyRate + tripodRate
    const totalClamped = Math.max(0, Math.min(100, total))

    const target120Need = Math.max(0, 120 - total)
    const target100Need = Math.max(0, 100 - total)
    const needCritStat120 = Math.ceil(target120Need * 27.9)
    const needCritStat100 = Math.ceil(target100Need * 27.9)

    return {
      baseCritRate,
      petRate,
      braceletRate,
      adrenalineRate,
      synergyRate,
      tripodRate,
      total,
      totalClamped,
      needCritStat120,
      needCritStat100,
    }
  }, [adrenalineLevel, braceletBonus, critStat, petBonus, synergyLevel, tripodLevel])

  return (
    <Card className="oyo-panel">
      <CardHeader>
        <CardTitle>전투 · 계산</CardTitle>
        <CardDescription>
          치명타 확률, 재련, 경매 낙찰 등 전투·강화 관련 계산기를 제공합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <section className="combat-crit-layout">
          <aside className="combat-crit-remote">
            <h4 className="combat-calc-title">치명타 계산기 설정</h4>

            <label className="combat-crit-field">
              <span>캐릭터명</span>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="캐릭터명 입력"
              />
            </label>

            <label className="combat-crit-field">
              <span>치명 스탯</span>
              <input
                type="number"
                value={critStat}
                onChange={(e) => setCritStat(Number(e.target.value || 0))}
                min={0}
              />
            </label>

            <div className="combat-crit-options">
              <p className="combat-crit-subtitle">추가 옵션</p>
              <label><input type="checkbox" checked={petBonus} onChange={(e) => setPetBonus(e.target.checked)} /> 펫 효과 (+10%)</label>
              <label><input type="checkbox" checked={braceletBonus} onChange={(e) => setBraceletBonus(e.target.checked)} /> 팔찌 옵션 (+10%)</label>
            </div>

            <label className="combat-crit-field">
              <span>시너지 역치</span>
              <select value={synergyLevel} onChange={(e) => setSynergyLevel(e.target.value)}>
                <option value="none">없음</option>
                <option value="low">1.5%</option>
                <option value="mid">1.8%</option>
                <option value="high">2.1%</option>
              </select>
            </label>

            <label className="combat-crit-field">
              <span>아드레날린 단계</span>
              <select value={adrenalineLevel} onChange={(e) => setAdrenalineLevel(Number(e.target.value))}>
                <option value={0}>0단</option>
                <option value={1}>1단</option>
                <option value={2}>2단</option>
                <option value={3}>3단</option>
                <option value={4}>4단 (20%)</option>
              </select>
            </label>

            <label className="combat-crit-field">
              <span>스킬 트라이포드</span>
              <select value={tripodLevel} onChange={(e) => setTripodLevel(e.target.value)}>
                <option value="none">없음</option>
                <option value="lv3">Lv3</option>
                <option value="lv4">Lv4</option>
                <option value="lv5">Lv5</option>
              </select>
            </label>
          </aside>

          <div className="combat-crit-main">
            <div className="combat-crit-summary-grid">
              <article className="combat-crit-summary-card">
                <h5>기본 치명타 확률</h5>
                <strong>{calc.totalClamped.toFixed(2)}%</strong>
                <p>현재 치명 스탯 + 선택 옵션 기준</p>
              </article>
              <article className="combat-crit-summary-card">
                <h5>등록한 기준 (최대 120%)</h5>
                <strong>{calc.needCritStat120.toLocaleString()}</strong>
                <p>추가 필요 치명 스탯</p>
              </article>
              <article className="combat-crit-summary-card">
                <h5>입력자 기준 (최대 100%)</h5>
                <strong>{calc.needCritStat100.toLocaleString()}</strong>
                <p>추가 필요 치명 스탯</p>
              </article>
            </div>

            <article className="combat-crit-detail-card">
              <h5>치명타 소스 요약</h5>
              <ul>
                <li><span>스탯</span><strong>+{calc.baseCritRate.toFixed(2)}%</strong></li>
                <li><span>펫</span><strong>+{calc.petRate.toFixed(2)}%</strong></li>
                <li><span>팔찌</span><strong>+{calc.braceletRate.toFixed(2)}%</strong></li>
                <li><span>아드레날린</span><strong>+{calc.adrenalineRate.toFixed(2)}%</strong></li>
                <li><span>시너지</span><strong>+{calc.synergyRate.toFixed(2)}%</strong></li>
              </ul>
            </article>

            <article className="combat-crit-detail-card">
              <h5>스킬 트라이포드 (뼈대)</h5>
              <p className="text-muted">인게임 트라이포드 항목/레벨 데이터를 여기에 매핑할 예정입니다. 현재는 선택 값만 반영합니다.</p>
            </article>

            <article className="combat-crit-detail-card">
              <h5>각인 / 아크패시브 (뼈대)</h5>
              <p className="text-muted">각인, 아크패시브, 장비 세트 등의 치명 보정 항목을 단계별로 추가할 예정입니다.</p>
            </article>
          </div>
        </section>

        <div className="combat-calc-grid">
          <article className="combat-calc-item">
            <h4 className="combat-calc-title">치명타 확률 계산기</h4>
            <p className="text-muted">위 패널에서 1차 뼈대를 구현했습니다. 다음 단계에서 인게임 값 매핑/정밀 계산식을 연결합니다.</p>
            <Button type="button" variant="secondary" size="sm">
              구현 중
            </Button>
          </article>

          <article className="combat-calc-item">
            <h4 className="combat-calc-title">재련 비용 계산기</h4>
            <p className="text-muted">준비 중. 일반/상급 재련 비용 및 기대값</p>
            <Button type="button" variant="secondary" size="sm" disabled>
              연동 예정
            </Button>
          </article>

          <article className="combat-calc-item">
            <h4 className="combat-calc-title">파괴 계산기</h4>
            <p className="text-muted">파괴(마리/재료/효율) 관련 계산기 placeholder</p>
            <Button type="button" variant="secondary" size="sm" disabled>
              추가 예정
            </Button>
          </article>

          <article className="combat-calc-item">
            <h4 className="combat-calc-title">무력화 계산기</h4>
            <p className="text-muted">스킬 무력화 수치/필요 조건 계산기 placeholder</p>
            <Button type="button" variant="secondary" size="sm" disabled>
              추가 예정
            </Button>
          </article>

          <article className="combat-calc-item">
            <h4 className="combat-calc-title">경매 낙찰 계산기</h4>
            <p className="text-muted">손익/적정가 산정용 placeholder</p>
            <Button type="button" variant="secondary" size="sm" disabled>
              추가 예정
            </Button>
          </article>
        </div>
      </CardContent>
    </Card>
  )
}
