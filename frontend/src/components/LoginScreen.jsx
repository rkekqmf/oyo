import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function LoginScreen() {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: 추후 실제 로그인 API 연결
    alert('로그인 기능은 준비 중입니다.')
  }

  return (
    <section className="view-panel">
      <div className="view-layout">
        <div className="view-main">
          <Card className="login-screen-card">
            <CardHeader>
              <CardTitle>로그인</CardTitle>
              <CardDescription>깐부 / 파티 / 공대 기능 사용을 위해 로그인해 주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="login-screen-form" onSubmit={handleSubmit}>
                <label className="login-screen-field">
                  <span>아이디</span>
                  <Input value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" />
                </label>
                <label className="login-screen-field">
                  <span>비밀번호</span>
                  <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
                </label>
                <div className="login-screen-actions">
                  <Button type="submit">로그인</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        <aside className="view-aside">
          <div className="view-remote-card">
            <h3 className="view-remote-title">안내</h3>
            <p className="view-remote-desc">현재는 로그인 UI만 제공됩니다. 실제 인증은 추후 연결됩니다.</p>
          </div>
        </aside>
      </div>
    </section>
  )
}
