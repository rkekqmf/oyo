function toArray(value) {
  return Array.isArray(value) ? value : []
}

export function getEngravingEffects(engravingPayload) {
  const fromEffects = toArray(engravingPayload?.Effects)
  const fromArkPassive = toArray(engravingPayload?.ArkPassiveEffects)
  const fromEngravings = toArray(engravingPayload?.Engravings)

  return [...fromEffects, ...fromArkPassive, ...fromEngravings].filter(
    (item) => item && (item.Name || item.Description)
  )
}

export function getEngravingNames(engravingPayload) {
  return getEngravingEffects(engravingPayload)
    .map((item) => item.Name || '')
    .filter(Boolean)
    .map((name) => name.trim())
}
