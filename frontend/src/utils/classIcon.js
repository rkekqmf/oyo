/**
 * 직업 아이콘: public/class-icons/ 폴더에 직업명과 동일한 파일명으로 넣으면 표시됩니다.
 * 예: 소서리스.png, 블레이드.png, 배틀마스터.png
 * 확장자: .png 또는 .webp (우선 .png 사용)
 */
const CLASS_SHORT = {
  소서리스: '소서',
  블레이드: '블레',
  배틀마스터: '배마',
  인파이터: '인파',
  기공사: '기공',
  창술사: '창술',
  스트라이커: '스트',
  데빌헌터: '데헌',
  호크아이: '호크',
  블래스터: '블래',
  스카우터: '스카',
  건슬링어: '건슬',
  바드: '바드',
  서머너: '서머',
  아르카나: '아르',
  소울이터: '소울',
  데모닉: '데모',
  리퍼: '리퍼',
  홀리나이트: '홀나',
  디스트로이어: '디트',
  워로드: '워로',
  버서커: '버서',
  슬레이어: '슬레이',
  브레이커: '브레이',
  기상술사: '기상',
  도화가: '도화',
  환수사: '환수',
}

export function getClassShortLabel(className) {
  if (!className || typeof className !== 'string') return '?'
  const trimmed = className.trim()
  return CLASS_SHORT[trimmed] ?? trimmed.slice(0, 2) ?? '?'
}

/** 직업 아이콘 이미지 경로 (public/class-icons/ 직업명.png) */
export function getClassIconSrc(className) {
  if (!className || typeof className !== 'string') return null
  const name = className.trim()
  if (!name) return null
  return `/class-icons/${encodeURIComponent(name)}.png`
}
