import { useEffect, useMemo, useState } from 'react'
import { getEngravingEffects } from '../utils/engraving'

const TABS = [
  { id: 'equipment', label: '장비' },
  { id: 'engravings', label: '각인' },
  { id: 'gems', label: '보석' },
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
          <button type="button" className="modal-close" onClick={onClose}>
            닫기
          </button>
        </header>

        <div className="modal-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'modal-tab is-active' : 'modal-tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
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
          </div>
        )}
      </section>
    </div>
  )
}
