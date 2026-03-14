import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { getEngravingEffects } from '../utils/engraving'

const TABS = [
  { id: 'equipment', label: '장비' },
  { id: 'engravings', label: '각인' },
  { id: 'gems', label: '보석' },
  { id: 'ark', label: '아크' },
  { id: 'community', label: '사사게' },
]

const LEFT_EQUIPMENT_ORDER = ['투구', '어깨', '상의', '하의', '장갑', '무기']
const LEFT_EQUIPMENT_LABEL = {
  투구: '머리',
  어깨: '견갑',
  상의: '상의',
  하의: '하의',
  장갑: '장갑',
  무기: '무기',
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
}

function shouldIgnoreTooltipLine(line) {
  const text = String(line || '').trim()
  if (!text) return true
  const normalized = text.toLowerCase()

  const ignoredTokens = [
    'nametagbox',
    'itemtitle',
    'singletextbox',
    'multitextbox',
    'showmethemoney',
    'element_',
    'indentstringgroup',
    'format:',
    'class:',
    '"type"',
    '"value"',
    "'type'",
    "'value'",
    'key:',
    'value:',
    'type:',
  ]

  if (ignoredTokens.some((token) => normalized.includes(token))) return true
  if (/^element_\d+$/i.test(text)) return true
  if (/^[\[\]\{\}",':\s]+$/.test(text)) return true
  return false
}

function collectTooltipTextParts(node) {
  if (node == null) return []

  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    const text = stripHtml(node)
    return text ? [text] : []
  }

  if (Array.isArray(node)) {
    return node.flatMap((item) => collectTooltipTextParts(item))
  }

  if (typeof node === 'object') {
    return Object.values(node).flatMap((value) => collectTooltipTextParts(value))
  }

  return []
}

function parseTooltipElementTexts(tooltip) {
  if (!tooltip) return []
  try {
    const parsed = typeof tooltip === 'string' ? JSON.parse(tooltip) : tooltip
    if (!parsed || typeof parsed !== 'object') return collectTooltipTextParts(tooltip)

    const ordered = Object.keys(parsed)
      .sort()
      .flatMap((key) => collectTooltipTextParts(parsed?.[key]))
      .filter(Boolean)

    const deduped = []
    for (const text of ordered) {
      if (shouldIgnoreTooltipLine(text)) continue
      if (deduped.includes(text)) continue
      deduped.push(text)
    }
    return deduped
  } catch {
    return collectTooltipTextParts(tooltip).filter((text) => !shouldIgnoreTooltipLine(text))
  }
}

function parseTooltipObject(tooltip) {
  if (!tooltip) return null
  try {
    const parsed = typeof tooltip === 'string' ? JSON.parse(tooltip) : tooltip
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function normalizeTooltipLine(text) {
  return String(text || '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function extractTooltipSectionLines(tooltip, headingKeyword) {
  const parsed = parseTooltipObject(tooltip)
  if (!parsed || typeof parsed !== 'object') return []

  const keys = Object.keys(parsed).sort()
  const lines = []
  let inSection = false

  for (const key of keys) {
    const element = parsed[key]
    const type = String(element?.type || '')
    const valueText = normalizeTooltipLine(stripHtml(element?.value))

    if (type === 'ItemPartBox') {
      inSection = valueText.includes(headingKeyword)
      continue
    }

    if (!inSection) continue
    if (!valueText || shouldIgnoreTooltipLine(valueText)) continue
    lines.push(valueText)
  }

  return lines
}

function extractTooltipText(tooltip) {
  const lines = parseTooltipElementTexts(tooltip).filter(
    (line) => !shouldIgnoreTooltipLine(line)
  )
  return lines[0] || ''
}

function extractGemType(nameText) {
  const source = String(nameText || '')
  const knownTypes = ['광휘', '겁화', '작열', '멸화', '홍염', '청명', '원해', '낙인']
  for (const type of knownTypes) {
    if (source.includes(type)) return type
  }

  const match = source.match(/([가-힣A-Za-z]+)\s*의\s*보석/)
  return match?.[1] || '보석'
}

function extractGemTier(gem) {
  const candidates = [
    gem?.Tier,
    gem?.tier,
    gem?.ItemTier,
    gem?.itemTier,
    gem?.tooltip,
    gem?.Tooltip,
  ]

  for (const candidate of candidates) {
    const text = normalizeTooltipLine(stripHtml(candidate))
    const match = text.match(/티어\s*([0-9]+)/)
    if (match?.[1]) return `티어 ${match[1]}`
  }

  const tooltipLines = parseTooltipElementTexts(gem?.Tooltip)
  for (const line of tooltipLines) {
    const match = String(line).match(/티어\s*([0-9]+)/)
    if (match?.[1]) return `티어 ${match[1]}`
  }

  return '-'
}

function extractGemEffect(gem) {
  const sectionLines = extractTooltipSectionLines(gem?.Tooltip, '효과')
    .map((line) => normalizeTooltipLine(line))
    .filter(Boolean)

  const preferred = sectionLines.find(
    (line) =>
      (line.includes('증가') || line.includes('감소')) &&
      !line.includes('조율된 보석') &&
      !line.includes('복원')
  )
  if (preferred) return preferred

  const fallback = parseTooltipElementTexts(gem?.Tooltip)
    .map((line) => normalizeTooltipLine(line))
    .find((line) => line.includes('재사용') || line.includes('증가') || line.includes('감소'))

  return fallback || '-'
}

function extractAccessoryEffectLines(tooltip, maxLines = 3) {
  const strongKeywords = [
    '치명', '치명타', '치명타 적중률', '치명타 피해', '특화', '신속', '제압', '인내',
    '숙련', '공격력', '무기 공격력', '추가 피해', '적에게 주는 피해', '피해량',
    '공격 및 이동 속도', '아군 공격력 강화 효과', '세레나데', '낙인력', '파티 보호막',
    '무력화', '상태이상', '전투 중 생명력 회복량',
  ]
  const weakKeywords = ['최대 생명력', '최대 마나', '방어력', '이동속도', '공격속도']
  const excludedKeywords = [
    '아이템 레벨', '거래 가능', '귀속', '획득 시', '분해', '판매', '내구도',
    '티어', '재련', '품질', '연마 효과', '팔찌 효과',
  ]

  const lines = parseTooltipElementTexts(tooltip)
    .flatMap((text) => text.split('\n'))
    .map((line) => line.trim())
    .filter(Boolean)

  const scored = []
  for (const line of lines) {
    if (shouldIgnoreTooltipLine(line)) continue
    if (line.length < 3) continue
    if (excludedKeywords.some((keyword) => line.includes(keyword))) continue

    const strongMatched = strongKeywords.some((keyword) => line.includes(keyword))
    const weakMatched = weakKeywords.some((keyword) => line.includes(keyword))
    const hasNumber = /[-+]?\d+([.,]\d+)?%?/.test(line)
    const hasOptionPattern =
      /[가-힣a-zA-Z][^:]{0,30}\s*[-+]?\d+([.,]\d+)?%/.test(line) ||
      /[가-힣a-zA-Z][^:]{0,30}\s*[-+]?\d+([.,]\d+)?$/.test(line)

    if (!strongMatched && !weakMatched) continue
    if (!hasNumber || !hasOptionPattern) continue

    let score = 0
    if (strongMatched) score += 3
    if (weakMatched) score += 1
    if (hasNumber) score += 2
    if (line.includes('%')) score += 1
    if (line.length > 90) score -= 1

    scored.push({ line, score })
  }

  const deduped = []
  for (const item of scored.sort((a, b) => b.score - a.score)) {
    if (deduped.some((existing) => existing.line === item.line)) continue
    deduped.push(item)
    if (deduped.length >= maxLines) break
  }

  return deduped.map((item) => ({
    text: item.line,
    tier: getAccessoryOptionTier(item.line, item.score),
  }))
}

function extractBraceletEffectLines(tooltip, maxLines = 5) {
  const keywords = [
    '치명',
    '특화',
    '신속',
    '제압',
    '인내',
    '숙련',
    '체력',
    '공격력',
    '무기 공격력',
    '추가 피해',
    '적에게 주는 피해',
    '치명타 피해',
    '치명타 적중률',
    '아군 공격력 강화 효과',
    '세레나데',
    '낙인력',
    '무력화',
    '상태이상',
    '피해량',
    '재사용 대기',
  ]
  const excluded = [
    '아이템 레벨',
    '거래 가능',
    '귀속',
    '획득 시',
    '분해',
    '판매',
    '내구도',
    '품질',
  ]

  const sectionLines = extractTooltipSectionLines(tooltip, '팔찌 효과')
  const lines = (sectionLines.length ? sectionLines : parseTooltipElementTexts(tooltip))
    // Keep each tooltip block as one option and collapse wrapped lines.
    .map((text) => normalizeTooltipLine(text))
    .filter(Boolean)

  const splitBraceletOptions = (line) => {
    const source = normalizeTooltipLine(line)
    if (!source) return []

    const stats = []
    const statPattern = /(치명|특화|신속|제압|인내|숙련|체력)\s*[+-]\s*\d+([.,]\d+)?/g
    for (const match of source.matchAll(statPattern)) {
      const statLine = normalizeTooltipLine(match[0])
      if (statLine) stats.push(statLine)
    }

    let remain = source.replace(statPattern, ' ')
    remain = normalizeTooltipLine(remain)
    if (!remain) return stats

    const rawSentences = remain
      .split(/(?<=\.)\s+/)
      .map((text) => normalizeTooltipLine(text))
      .filter(Boolean)

    const mergedSentences = []
    for (const sentence of rawSentences) {
      const shouldMergeWithPrev =
        sentence.includes('악마 및 대악마 계열 피해량') &&
        mergedSentences.length > 0 &&
        mergedSentences[mergedSentences.length - 1].includes('추가 피해')

      if (shouldMergeWithPrev) {
        mergedSentences[mergedSentences.length - 1] = normalizeTooltipLine(
          `${mergedSentences[mergedSentences.length - 1]} ${sentence}`
        )
      } else {
        mergedSentences.push(sentence)
      }
    }

    return [...stats, ...mergedSentences]
  }

  const picked = []

  for (const line of lines) {
    if (shouldIgnoreTooltipLine(line)) continue
    if (excluded.some((token) => line.includes(token))) continue
    if (!/[0-9]/.test(line)) continue

    const optionLines = splitBraceletOptions(line)
    for (const option of optionLines) {
      const matched = keywords.some((keyword) => option.includes(keyword))
      if (!matched) continue
      if (picked.some((existing) => existing.text === option)) continue
      picked.push({ text: option, tier: getAccessoryOptionTier(option, 0) })
      if (picked.length >= maxLines) return picked
    }
  }

  return picked
}

function extractStoneEffectLines(tooltip, maxLines = 4) {
  const lines = parseTooltipElementTexts(tooltip)
    .flatMap((text) => text.split('\n'))
    .map((line) => normalizeTooltipLine(line))
    .filter(Boolean)

  const engravingEffects = []
  let levelBonusAttack = null

  for (const line of lines) {
    if (shouldIgnoreTooltipLine(line)) continue
    if (/^\[\s*.+\s*\]\s*Lv\.\s*\d+/i.test(line)) {
      const tier = line.includes('감소') ? 'mid' : 'high'
      if (!engravingEffects.some((item) => item.text === line)) {
        engravingEffects.push({ text: line, tier })
      }
      continue
    }

    if (
      line.includes('[ 레벨 보너스 ]') &&
      (line.includes('기본 공격력') || line.includes('기본공격력'))
    ) {
      levelBonusAttack = { text: line, tier: 'high' }
    }
  }

  const picked = [...engravingEffects]
  if (levelBonusAttack) picked.push(levelBonusAttack)
  return picked.slice(0, maxLines)
}

function parseFirstNumber(value) {
  const match = String(value || '').match(/[-+]?\d+([.,]\d+)?/)
  if (!match) return null
  const parsed = Number.parseFloat(match[0].replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function getAccessoryOptionTier(line, fallbackScore = 0) {
  const text = String(line || '')
  const number = parseFirstNumber(text)
  const hasPercent = text.includes('%')

  if (number != null) {
    if (text.includes('추가 피해') || text.includes('적에게 주는 피해')) {
      if (number >= 2) return 'high'
      if (number >= 1.2) return 'mid'
      return 'low'
    }

    if (text.includes('치명타 피해')) {
      if (number >= 4) return 'high'
      if (number >= 2.4) return 'mid'
      return 'low'
    }

    if (text.includes('치명타 적중률')) {
      if (number >= 1.55) return 'high'
      if (number >= 0.95) return 'mid'
      return 'low'
    }

    if (text.includes('무기 공격력') || text.includes('공격력')) {
      if (hasPercent) {
        if (number >= 1.5) return 'high'
        if (number >= 0.8) return 'mid'
        return 'low'
      }
      if (number >= 390) return 'high'
      if (number >= 300) return 'mid'
      return 'low'
    }

    if (
      text.includes('치명') ||
      text.includes('특화') ||
      text.includes('신속') ||
      text.includes('제압') ||
      text.includes('인내') ||
      text.includes('숙련')
    ) {
      if (number >= 95) return 'high'
      if (number >= 75) return 'mid'
      return 'low'
    }

    if (text.includes('아군 공격력 강화 효과') || text.includes('세레나데')) {
      if (number >= 5) return 'high'
      if (number >= 3) return 'mid'
      return 'low'
    }
  }

  if (fallbackScore >= 7) return 'high'
  if (fallbackScore >= 5) return 'mid'
  return 'low'
}

function normalizeEquipmentType(type) {
  const text = String(type || '').trim()
  if (text.includes('투구')) return '투구'
  if (text.includes('어깨')) return '어깨'
  if (text.includes('상의')) return '상의'
  if (text.includes('하의')) return '하의'
  if (text.includes('장갑')) return '장갑'
  if (text.includes('무기')) return '무기'
  if (text.includes('목걸이')) return '목걸이'
  if (text.includes('귀걸이')) return '귀걸이'
  if (text.includes('반지')) return '반지'
  if (text.includes('팔찌')) return '팔찌'
  if (
    text.includes('어빌리티 스톤') ||
    text.includes('어빌리티스톤') ||
    text.toLowerCase().includes('ability stone') ||
    (text.includes('스톤') && !text.includes('보석'))
  ) {
    return '어빌리티 스톤'
  }
  return ''
}

function getEnhancementLevel(item) {
  const fromName = String(item?.Name || '').match(/\+(\d{1,2})/)
  if (fromName?.[1]) return Number.parseInt(fromName[1], 10)

  const tooltipLines = parseTooltipElementTexts(item?.Tooltip)
  for (const line of tooltipLines) {
    const match = line.match(/강화[^0-9+]*\+?(\d{1,2})/)
    if (match?.[1]) return Number.parseInt(match[1], 10)
  }
  return null
}

function getQualityValue(item) {
  const directCandidates = [
    item?.GradeQuality,
    item?.QualityValue,
    item?.Quality,
    item?.raw?.GradeQuality,
    item?.raw?.QualityValue,
    item?.raw?.Quality,
  ]

  for (const candidate of directCandidates) {
    const numeric = Number.parseInt(String(candidate || ''), 10)
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 100) {
      return numeric
    }
  }

  const rawTooltip = item?.Tooltip || item?.raw?.Tooltip
  const tooltipString = String(rawTooltip || '')

  // Fast path: many tooltips include explicit quality keys.
  const qualityKeyMatch =
    tooltipString.match(/"qualityValue"\s*:\s*([0-9]{1,3})/i) ||
    tooltipString.match(/"gradeQuality"\s*:\s*([0-9]{1,3})/i) ||
    tooltipString.match(/"quality"\s*:\s*([0-9]{1,3})/i)
  if (qualityKeyMatch?.[1]) {
    const value = Number.parseInt(qualityKeyMatch[1], 10)
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      return value
    }
  }

  const tooltipLines = parseTooltipElementTexts(item?.Tooltip || item?.raw?.Tooltip)
  for (const line of tooltipLines) {
    const match = line.match(/품질[^0-9]*([0-9]{1,3})/)
    if (!match?.[1]) continue
    const value = Number.parseInt(match[1], 10)
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      return value
    }
  }

  // Last fallback: raw html/text may still contain "품질 95".
  const rawKoreanMatch = tooltipString.match(/품질[^0-9]{0,6}([0-9]{1,3})/)
  if (rawKoreanMatch?.[1]) {
    const value = Number.parseInt(rawKoreanMatch[1], 10)
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      return value
    }
  }

  return null
}

function getQualityTier(quality) {
  if (!Number.isFinite(quality) || quality == null) return ''
  if (quality >= 100) return 'high'
  if (quality >= 90) return 'mid'
  return 'low'
}

function QualityBar({ quality }) {
  if (quality == null || !Number.isFinite(quality)) return null

  const normalized = Math.max(0, Math.min(100, quality))
  const tier = getQualityTier(normalized)

  return (
    <div
      className="equipment-quality-bar"
      title={`품질 ${normalized}`}
      aria-label={`품질 ${normalized}`}
    >
      <span
        className={`equipment-quality-fill quality-${tier || 'low'}`}
        style={{ width: `${normalized}%` }}
      />
      <span className={`equipment-quality-value quality-${tier || 'low'}`}>
        품질 {normalized}
      </span>
    </div>
  )
}

function buildEquipmentBoardItems(equipment) {
  const source = Array.isArray(equipment) ? equipment : []
  const mapped = source
    .map((item) => ({
      raw: item,
      normalizedType: normalizeEquipmentType(item?.Type),
      gradeKey: pickGradeKey(item?.Grade, item?.Name, item?.Tooltip),
      imageUrl: item?.Icon || '',
      name: item?.Name || '-',
      enhancement: getEnhancementLevel(item),
      quality: getQualityValue(item),
    }))
    .filter((item) => item.normalizedType)

  const bySingle = new Map()
  const earrings = []
  const rings = []

  for (const item of mapped) {
    if (item.normalizedType === '귀걸이') {
      earrings.push(item)
      continue
    }
    if (item.normalizedType === '반지') {
      rings.push(item)
      continue
    }
    if (!bySingle.has(item.normalizedType)) {
      bySingle.set(item.normalizedType, item)
    }
  }

  const left = LEFT_EQUIPMENT_ORDER.map((type) => {
    const item = bySingle.get(type) || null
    return {
      key: `left-${type}`,
      type,
      label: LEFT_EQUIPMENT_LABEL[type] || type,
      item,
    }
  })

  const right = [
    { key: 'necklace', type: '목걸이', item: bySingle.get('목걸이') || null },
    { key: 'earring-1', type: '귀걸이', item: earrings[0] || null },
    { key: 'earring-2', type: '귀걸이', item: earrings[1] || null },
    { key: 'ring-1', type: '반지', item: rings[0] || null },
    { key: 'ring-2', type: '반지', item: rings[1] || null },
    { key: 'bracelet', type: '팔찌', item: bySingle.get('팔찌') || null },
    { key: 'stone', type: '어빌리티 스톤', item: bySingle.get('어빌리티 스톤') || null },
  ].map((slot) => {
    let effectLines = []
    if (slot.type === '목걸이' || slot.type === '귀걸이' || slot.type === '반지') {
      effectLines = extractAccessoryEffectLines(slot.item?.raw?.Tooltip, 3)
    } else if (slot.type === '팔찌') {
      effectLines = extractBraceletEffectLines(slot.item?.raw?.Tooltip, 5)
    } else if (slot.type === '어빌리티 스톤') {
      effectLines = extractStoneEffectLines(slot.item?.raw?.Tooltip, 4)
    }
    return { ...slot, effectLines }
  })

  return { left, right }
}

function EquipmentBoard({ board }) {
  const leftSlots = board?.left || []
  const rightSlots = board?.right || []

  return (
    <div className="equipment-board">
      <div className="equipment-board-left">
        {leftSlots.map((slot) => {
          const item = slot.item
          return (
            <article key={slot.key} className="equipment-slot-card">
              <div
                className={
                  item?.gradeKey
                    ? `detail-visual-icon-wrap grade-frame-${item.gradeKey}`
                    : 'detail-visual-icon-wrap'
                }
                title={item?.name || slot.label}
              >
                {item?.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="detail-visual-icon" />
                ) : (
                  <div className="detail-visual-icon-fallback">-</div>
                )}
              </div>
              <div className="equipment-slot-meta">
                <span
                  className={
                    item?.gradeKey
                      ? `equipment-item-name grade-text-${item.gradeKey}`
                      : 'equipment-item-name'
                  }
                >
                  {item?.name || '-'}
                </span>
                <QualityBar quality={item?.quality} />
              </div>
            </article>
          )
        })}
      </div>

      <div className="equipment-board-right">
        {rightSlots.map((slot) => {
          const item = slot.item
          return (
            <article key={slot.key} className="equipment-accessory-card">
              <div className="equipment-accessory-head">
                <div
                  className={
                    item?.gradeKey
                      ? `detail-visual-icon-wrap grade-frame-${item.gradeKey}`
                      : 'detail-visual-icon-wrap'
                  }
                  title={item?.name || slot.type}
                >
                  {item?.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="detail-visual-icon" />
                  ) : (
                    <div className="detail-visual-icon-fallback">-</div>
                  )}
                </div>
                <div className="equipment-accessory-meta">
                  <strong
                    className={
                      item?.gradeKey
                        ? `equipment-item-name grade-text-${item.gradeKey}`
                        : 'equipment-item-name'
                    }
                  >
                    {item?.name || '-'}
                  </strong>
                  <QualityBar quality={item?.quality} />
                </div>
              </div>

              {slot.effectLines.length ? (
                <ul className="equipment-effect-list">
                  {slot.effectLines.map((effect, idx) => (
                    <li
                      key={`${slot.key}-effect-${idx}`}
                      className={`equipment-effect-${effect.tier || 'low'}`}
                    >
                      {effect.text}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function toGradeKey(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  if (raw.includes('고대') || raw.includes('ancient')) return 'ancient'
  if (raw.includes('유물') || raw.includes('relic')) return 'relic'
  if (raw.includes('전설') || raw.includes('legend')) return 'legendary'
  if (raw.includes('영웅') || raw.includes('hero')) return 'heroic'
  if (raw.includes('희귀') || raw.includes('rare')) return 'rare'
  if (raw.includes('고급') || raw.includes('uncommon')) return 'uncommon'
  return ''
}

function pickGradeKey(...candidates) {
  for (const candidate of candidates) {
    const key = toGradeKey(candidate)
    if (key) return key
  }
  return ''
}

function VisualGrid({ items, emptyMessage, compact = false }) {
  if (!items.length) return <p className="detail-empty">{emptyMessage}</p>

  return (
    <ul className={compact ? 'detail-visual-grid compact' : 'detail-visual-grid'}>
      {items.map((item) => (
        <li
          key={item.key}
          className={compact ? 'detail-visual-card compact' : 'detail-visual-card'}
          title={item.subTitle || item.title}
        >
          <div className="detail-visual-top">
            <div
              className={
                item.gradeKey
                  ? `detail-visual-icon-wrap grade-frame-${item.gradeKey}`
                  : 'detail-visual-icon-wrap'
              }
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="detail-visual-icon"
                  loading="lazy"
                />
              ) : (
                <div className="detail-visual-icon-fallback">{item.fallbackIcon || '•'}</div>
              )}
            </div>
            {!compact ? (
              <div className="detail-visual-head">
                <strong
                  className={
                    item.gradeKey
                      ? `detail-visual-title grade-text-${item.gradeKey}`
                      : 'detail-visual-title'
                  }
                >
                  {item.title}
                </strong>
                {item.subTitle ? <span>{item.subTitle}</span> : null}
              </div>
            ) : null}
          </div>
          {!compact ? (
            <>
              {item.value ? <p className="detail-visual-main">{item.value}</p> : null}
              {item.description ? (
                <p className="detail-visual-desc">{item.description}</p>
              ) : null}
            </>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function MainCharacterPanel({
  character,
  detail,
  insight,
  loading,
  error,
  expeditionCharacters,
  sasageLoading,
  sasageWarning,
  sasagePosts,
}) {
  const [activeTab, setActiveTab] = useState('equipment')
  const profile = detail?.profile || {}

  const equipmentBoard = useMemo(
    () => buildEquipmentBoardItems(detail?.equipment),
    [detail?.equipment]
  )

  const engravingItems = useMemo(
    () =>
      getEngravingEffects(detail?.engravings).map((effect, idx) => ({
        key: `${effect.Name || 'engraving'}-${idx}`,
        title: effect.Name || '-',
        value: stripHtml(effect.Description || ''),
        description: '',
        fallbackIcon: '📘',
        gradeKey: pickGradeKey(effect.Grade, effect.Name, effect.Description),
      })),
    [detail?.engravings]
  )

  const gemItems = useMemo(
    () =>
      (Array.isArray(detail?.gems?.Gems) ? detail.gems.Gems : []).map((gem, idx) => {
        const nameText = normalizeTooltipLine(stripHtml(gem?.Name || ''))
        const levelMatch = nameText.match(/(\d+)\s*레벨/) || nameText.match(/Lv\.?\s*(\d+)/i)
        const level = gem?.Level || (levelMatch?.[1] ? Number.parseInt(levelMatch[1], 10) : null)
        const gemType = extractGemType(nameText)
        const gemTier = extractGemTier(gem)
        const gemEffect = extractGemEffect(gem)

        return {
          key: `${nameText || 'gem'}-${idx}`,
          title: gemType || nameText || '-',
          subTitle: gemTier,
          value: level ? `Lv.${level}` : '-',
          description: gemEffect,
          imageUrl: gem.Icon || '',
          fallbackIcon: '💎',
          gradeKey: pickGradeKey(gem.Grade, nameText, gemTier),
        }
      }),
    [detail?.gems?.Gems]
  )

  const arkGridItems = useMemo(() => {
    const gridItems = [
      ...(Array.isArray(detail?.arkGrid?.Effects) ? detail.arkGrid.Effects : []),
      ...(Array.isArray(detail?.arkGrid?.Nodes) ? detail.arkGrid.Nodes : []),
      ...(Array.isArray(detail?.arkGrid?.Slots) ? detail.arkGrid.Slots : []),
      ...(Array.isArray(detail?.arkGrid?.Grids) ? detail.arkGrid.Grids : []),
      ...(Array.isArray(detail?.arkGrid?.Blocks) ? detail.arkGrid.Blocks : []),
      ...(Array.isArray(detail?.arkGrid?.ArkGridEffects) ? detail.arkGrid.ArkGridEffects : []),
      ...(Array.isArray(detail?.arkGrid?.Data) ? detail.arkGrid.Data : []),
    ]
    return gridItems.map((item, idx) => ({
      key: `grid-${idx}`,
      title: item.Name || item.Type || '아크 그리드',
      value: [item.Value || item.Point || item.Level || item.Tier || '-']
        .filter(Boolean)
        .join(' '),
      description: stripHtml(item.Description || ''),
      imageUrl: item.Icon || '',
      fallbackIcon: '🧩',
      gradeKey: pickGradeKey(item.Grade, item.Name, item.Description),
    }))
  }, [detail?.arkGrid])

  const arkPassiveItems = useMemo(() => {
    const passiveEffects = [
      ...(Array.isArray(detail?.arkPassive?.Effects) ? detail.arkPassive.Effects : []),
      ...(Array.isArray(detail?.engravings?.ArkPassiveEffects)
        ? detail.engravings.ArkPassiveEffects
        : []),
    ]

    return passiveEffects.map((item, idx) => ({
      key: `passive-${idx}`,
      title: item.Name || '아크 패시브',
      value: stripHtml(item.Description || ''),
      description: '',
      imageUrl: item.Icon || '',
      fallbackIcon: '✨',
      gradeKey: pickGradeKey(item.Grade, item.Name, item.Description),
    }))
  }, [detail?.arkPassive, detail?.engravings?.ArkPassiveEffects])

  if (!character && !loading && !error) {
    return <p className="result-empty">검색한 캐릭터의 상세 정보를 여기에 표시합니다.</p>
  }

  return (
    <Card className="main-character-section">
      <CardHeader>
        <CardTitle>{character?.CharacterName || profile?.CharacterName || '캐릭터 상세'}</CardTitle>
        <CardDescription>
          {character?.ServerName || profile?.ServerName || '-'} /{' '}
          {character?.CharacterClassName || profile?.CharacterClassName || '-'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <p className="detail-empty">상세 정보를 불러오는 중입니다...</p> : null}
        {error ? <p className="result-error">{error}</p> : null}

        {!loading && !error ? (
          <>
            <div className="main-character-top">
              <div className="main-character-summary">
                <p>아이템 레벨: {profile?.ItemAvgLevel || character?.ItemAvgLevel || '-'}</p>
                <p>길드: {profile?.GuildName || '-'}</p>
                <p>칭호: {profile?.Title || '-'}</p>
                <p>원정대 레벨: {profile?.ExpeditionLevel || '-'}</p>
                <p>원정대 캐릭터 수: {expeditionCharacters.length}</p>
                <p>점수: {insight ? `${insight.score.toLocaleString()} (${insight.grade}등급)` : '-'}</p>
              </div>
              <div className="main-character-tabs">
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
            </div>

            <div className="main-character-content">
              {activeTab === 'equipment' && (
                <EquipmentBoard board={equipmentBoard} />
              )}
              {activeTab === 'engravings' && (
                <VisualGrid items={engravingItems} emptyMessage="각인 정보가 없습니다." />
              )}
              {activeTab === 'gems' && (
                <VisualGrid items={gemItems} emptyMessage="보석 정보가 없습니다." />
              )}
              {activeTab === 'ark' && (
                <div className="ark-split-section">
                  <div className="ark-split-block">
                    <p className="ark-split-title">아크 그리드</p>
                    <VisualGrid items={arkGridItems} emptyMessage="아크 그리드 정보가 없습니다." />
                  </div>
                  <div className="ark-split-block">
                    <p className="ark-split-title">아크 패시브</p>
                    <VisualGrid items={arkPassiveItems} emptyMessage="아크 패시브 정보가 없습니다." />
                  </div>
                </div>
              )}
              {activeTab === 'community' && (
                <div>
                  {sasageWarning ? <p className="result-error">{sasageWarning}</p> : null}
                  {sasageLoading ? <p className="detail-empty">사사게 조회 중...</p> : null}
                  {!sasageLoading && !sasagePosts.length ? (
                    <p className="detail-empty">사사게 검색 결과가 없습니다.</p>
                  ) : null}
                  {!!sasagePosts.length ? (
                    <ul className="sasage-list">
                      {sasagePosts.map((post) => (
                        <li key={post.url} className="sasage-item">
                          <a href={post.url} target="_blank" rel="noreferrer">
                            {post.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

