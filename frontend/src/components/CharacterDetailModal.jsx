import { useEffect, useMemo, useState } from 'react'
import { getEngravingEffects } from '../utils/engraving'
import { Button } from './ui/button'

const TABS = [
  { id: 'equipment', label: '장비' },
  { id: 'engravings', label: '각인' },
  { id: 'gems', label: '보석' },
  { id: 'ark', label: '아크' },
]

function EquipmentTab({ equipment }) {
  if (!Array.isArray(equipment) || equipment.length === 0) {
    return <p className="detail-empty">장비 정보가 없습니다.</p>
  }

  return (
    <ul className="detail-list">
      {equipment.map((item, idx) => (
        <li key={`${item.Type}-${idx}`} className="detail-list-item">
          <strong>{item.Type || '장비'}</strong>
          <span>{item.Name || '-'}</span>
        </li>
      ))}
    </ul>
  )
}

function EngravingsTab({ engravings }) {
  const effects = getEngravingEffects(engravings)
  if (!effects.length) {
    return <p className="detail-empty">각인 정보가 없습니다.</p>
  }

  return (
    <ul className="detail-list">
      {effects.map((effect, idx) => (
        <li key={`${effect.Name}-${idx}`} className="detail-list-item">
          <strong>{effect.Name || '-'}</strong>
          <span>{effect.Description || effect.Grade || '-'}</span>
        </li>
      ))}
    </ul>
  )
}

function GemsTab({ gems }) {
  const gemItems = gems?.Gems || []
  if (!gemItems.length) {
    return <p className="detail-empty">보석 정보가 없습니다.</p>
  }

  return (
    <ul className="detail-list">
      {gemItems.map((gem, idx) => (
        <li key={`${gem.Name}-${idx}`} className="detail-list-item">
          <strong>{gem.Name || '-'}</strong>
          <span>{gem.Level ? `Lv.${gem.Level}` : '-'}</span>
        </li>
      ))}
    </ul>
  )
}

function ArkTab({ arkPassive, arkGrid, engravings }) {
  const points = Array.isArray(arkPassive?.ArkPassivePoints)
    ? arkPassive.ArkPassivePoints
    : []
  const effects = [
    ...(Array.isArray(arkPassive?.Effects) ? arkPassive.Effects : []),
    ...(Array.isArray(engravings?.ArkPassiveEffects)
      ? engravings.ArkPassiveEffects
      : []),
  ]
  const gridItems = [
    ...(Array.isArray(arkGrid?.Effects) ? arkGrid.Effects : []),
    ...(Array.isArray(arkGrid?.Nodes) ? arkGrid.Nodes : []),
    ...(Array.isArray(arkGrid?.Slots) ? arkGrid.Slots : []),
    ...(Array.isArray(arkGrid?.Grids) ? arkGrid.Grids : []),
    ...(Array.isArray(arkGrid?.Blocks) ? arkGrid.Blocks : []),
    ...(Array.isArray(arkGrid?.ArkGridEffects) ? arkGrid.ArkGridEffects : []),
    ...(Array.isArray(arkGrid?.Data) ? arkGrid.Data : []),
  ]

  if (!points.length && !effects.length && !gridItems.length) {
    return <p className="detail-empty">아크 패시브/그리드 정보가 없습니다.</p>
  }

  return (
    <div className="ark-detail-wrap">
      {gridItems.length ? (
        <>
          <p className="ark-detail-title">아크 그리드</p>
          <ul className="detail-list">
            {gridItems.map((item, idx) => (
              <li
                key={`${item.Name || item.Type || 'grid'}-${idx}`}
                className="detail-list-item"
              >
                <strong>{item.Name || item.Type || '그리드 노드'}</strong>
                <span>
                  {item.Value || item.Point || item.Level || item.Tier || '-'}
                  {item.Description ? ` (${item.Description})` : ''}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {points.length ? (
        <>
          <p className="ark-detail-title">아크 그리드(포인트)</p>
          <ul className="detail-list">
            {points.map((point, idx) => (
              <li
                key={`${point.Name || point.Type || 'point'}-${idx}`}
                className="detail-list-item"
              >
                <strong>{point.Name || point.Type || '포인트'}</strong>
                <span>
                  {point.Value || point.Point || point.Level || 0}
                  {point.Description ? ` (${point.Description})` : ''}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {effects.length ? (
        <>
          <p className="ark-detail-title">아크 패시브 효과</p>
          <ul className="detail-list">
            {effects.map((effect, idx) => (
              <li key={`${effect.Name || 'effect'}-${idx}`} className="detail-list-item">
                <strong>{effect.Name || '-'}</strong>
                <span>{effect.Description || effect.Grade || '-'}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

export function CharacterDetailModal({
  open,
  character,
  detail,
  loading,
  error,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('equipment')

  useEffect(() => {
    if (open) {
      setActiveTab('equipment')
    }
  }, [open, character?.CharacterName])

  const title = useMemo(() => {
    if (!character) return '캐릭터 상세 정보'
    return `${character.CharacterName} 상세 정보`
  }, [character])

  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            <p>{character?.ServerName || '-'} / {character?.CharacterClassName || '-'}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="modal-close"
            onClick={onClose}
          >
            닫기
          </Button>
        </header>

        <div className="modal-tabs">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={activeTab === tab.id ? 'default' : 'secondary'}
              className={activeTab === tab.id ? 'modal-tab is-active' : 'modal-tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {loading && <p className="detail-empty">상세 정보를 불러오는 중입니다...</p>}
        {error && !loading && <p className="result-error">{error}</p>}

        {!loading && !error && (
          <div className="modal-content">
            {activeTab === 'equipment' && <EquipmentTab equipment={detail?.equipment} />}
            {activeTab === 'engravings' && (
              <EngravingsTab engravings={detail?.engravings} />
            )}
            {activeTab === 'gems' && <GemsTab gems={detail?.gems} />}
            {activeTab === 'ark' && (
              <ArkTab
                arkPassive={detail?.arkPassive}
                arkGrid={detail?.arkGrid}
                engravings={detail?.engravings}
              />
            )}
          </div>
        )}
      </section>
    </div>
  )
}
