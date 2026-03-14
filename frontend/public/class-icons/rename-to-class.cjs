const fs = require('fs')
const path = require('path')

const dir = __dirname
const map = {
  '실린_로고_소서리스.png': '소서리스.png',
  '페이튼_로고_블레이드.png': '블레이드.png',
  '애니츠_로고_배틀마스터.png': '배틀마스터.png',
  '애니츠_로고_인파이터.png': '인파이터.png',
  '애니츠_로고_기공사.png': '기공사.png',
  '애니츠_로고_창술사.png': '창술사.png',
  '애니츠_로고_스트라이커.png': '스트라이커.png',
  '아르데타인_로고_데빌헌터.png': '데빌헌터.png',
  '아르데타인_로고_호크아이.png': '호크아이.png',
  '아르데타인_블래스터.png': '블래스터.png',
  '아르데타인_로고_스카우터.png': '스카우터.png',
  '아르데타인_로고_건슬링어.png': '건슬링어.png',
  '실린_로고_바드.png': '바드.png',
  '실린_로고_서머너.png': '서머너.png',
  '실린_로고_아르카나.png': '아르카나.png',
  '페이튼_로고_소울이터.png': '소울이터.png',
  '페이튼_로고_데모닉.png': '데모닉.png',
  '페이튼_로고_리퍼.png': '리퍼.png',
  '슈샤이어_로고_홀리나이트.png': '홀리나이트.png',
  '슈샤이어_로고_디스트로이어.png': '디스트로이어.png',
  '슈샤이어_로고_워로드.png': '워로드.png',
  '슈샤이어_로고_버서커.png': '버서커.png',
  '슈샤이어_로고_슬레이어.png': '슬레이어.png',
  '애니츠_로고_브레이커.png': '브레이커.png',
  '스페셜리스트_기상술사.png': '기상술사.png',
  '요즈_로고_환수사.png': '환수사.png',
  '스페셜리스트_도화가.png': '도화가.png',
}

for (const [oldName, newName] of Object.entries(map)) {
  const oldPath = path.join(dir, oldName)
  const newPath = path.join(dir, newName)
  if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
    fs.renameSync(oldPath, newPath)
    console.log(oldName, '->', newName)
  }
}
console.log('Done.')
