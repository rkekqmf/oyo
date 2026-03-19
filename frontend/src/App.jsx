import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { AuctionMarketPanel } from './components/AuctionMarketPanel'
import { BossReadinessPanel } from './components/BossReadinessPanel'
import { CharacterComparePanel } from './components/CharacterComparePanel'
import { CharacterDetailModal } from './components/CharacterDetailModal'
import { FavoriteCharacters } from './components/FavoriteCharacters'
import { CharacterResult } from './components/CharacterResult'
import { CharacterSearchForm } from './components/CharacterSearchForm'
import { RecentSearches } from './components/RecentSearches'
import { MainCharacterPanel } from './components/MainCharacterPanel'
import { ScoreRankPanel } from './components/ScoreRankPanel'
import { RevenueEfficiencyPanel } from './components/RevenueEfficiencyPanel'
import { CombatCalcPanel } from './components/CombatCalcPanel'
import { HomeworkPanel } from './components/HomeworkPanel'
import { LoginScreen } from './components/LoginScreen'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { useCharacterSearch } from './hooks/useCharacterSearch'
import { useFavorites } from './hooks/useFavorites'
import { useAdminMode } from './contexts/AdminModeContext'
import { fetchCharacterArmory } from './services/lostarkApi'

/** adminOnly: true 이면 일반 모드에서는 탭이 보이지 않음 (관리자만) */
const VIEWS = [
  { id: 'search', label: '캐릭터 검색', adminOnly: true },
  { id: 'homework', label: '숙제' },
  { id: 'market', label: '경매장 추이', adminOnly: true },
  { id: 'boss', label: '보스 준비도', adminOnly: true },
  { id: 'score', label: '점수·랭킹', adminOnly: true },
  { id: 'revenue', label: '효율', adminOnly: true },
  { id: 'combat', label: '전투·계산', adminOnly: true },
  { id: 'login', label: '로그인' },
]

function App() {
  const { isAdminMode, toggleAdminMode } = useAdminMode()
  const DESIGN_THEME_STORAGE_KEY = 'oyo_design_theme'
  const [designTheme, setDesignTheme] = useState(() => {
    try {
      const v = localStorage.getItem(DESIGN_THEME_STORAGE_KEY)
      return v === 'light' || v === 'dark' ? v : 'default'
    } catch {
      return 'default'
    }
  })
  const {
    name,
    setName,
    result,
    mainCharacter,
    mainDetail,
    mainDetailLoading,
    mainDetailError,
    loading,
    error,
    sasagePosts,
    sasageLoading,
    sasageWarning,
    combatInsightsByKey,
    upsertCombatInsight,
    search,
    recentSearches,
    clearRecentSearches,
  } = useCharacterSearch()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [activeView, setActiveView] = useState('homework')
  const adminClickCount = useRef(0)
  const adminClickTimer = useRef(null)

  useEffect(() => {
    const root = document.documentElement
    if (designTheme === 'default') {
      delete root.dataset.theme
    } else {
      root.dataset.theme = designTheme
    }
    try {
      localStorage.setItem(DESIGN_THEME_STORAGE_KEY, designTheme)
    } catch {}
  }, [designTheme])

  const handleAdminAreaClick = () => {
    adminClickCount.current += 1
    if (adminClickTimer.current) clearTimeout(adminClickTimer.current)
    if (adminClickCount.current >= 5) {
      adminClickCount.current = 0
      toggleAdminMode()
    } else {
      adminClickTimer.current = setTimeout(() => {
        adminClickCount.current = 0
      }, 1500)
    }
  }

  const visibleViews = useMemo(
    () => VIEWS.filter((v) => !v.adminOnly || isAdminMode),
    [isAdminMode]
  )
  const menuViews = useMemo(
    () => visibleViews.filter((v) => v.id !== 'login'),
    [visibleViews]
  )
  const activeViewValid = useMemo(
    () => visibleViews.some((v) => v.id === activeView),
    [visibleViews, activeView]
  )
  useEffect(() => {
    if (!activeViewValid && visibleViews.length) setActiveView(visibleViews[0].id)
  }, [activeViewValid, visibleViews])

  const handleSelectCharacter = async (character) => {
    const targetName = character?.CharacterName
    if (!targetName) return

    setSelectedCharacter(character)
    setDetailLoading(true)
    setDetailError('')
    setDetailData(null)

    try {
      const data = await fetchCharacterArmory(targetName)
      setDetailData(data)
      upsertCombatInsight(character, data)
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : '상세 조회 중 오류가 발생했습니다.')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeModal = () => {
    setSelectedCharacter(null)
    setDetailData(null)
    setDetailError('')
    setDetailLoading(false)
  }

  const availableCharacters = useMemo(() => {
    const fromSearch = Array.isArray(result) ? result : []
    const map = new Map()

    ;[...favorites, ...fromSearch].forEach((character) => {
      if (!character?.CharacterName || !character?.ServerName) return
      map.set(`${character.CharacterName}:${character.ServerName}`, character)
    })

    return Array.from(map.values())
  }, [favorites, result])

  return (
    <main className="app-shell">
      <header className="app-header">
        <div
          role="banner"
          className="app-header-inner"
          onClick={handleAdminAreaClick}
          title={isAdminMode ? '관리자 모드 (5번 클릭으로 해제)' : undefined}
        >
          <h1 className="app-logo">
            <span className="app-logo-letter app-logo-o">O</span>
            <span className="app-logo-letter">Y</span>
            <span className="app-logo-letter app-logo-o">O</span>
          </h1>
        </div>

        <div className="app-header-actions">
          <div className="app-theme-toggle" role="group" aria-label="디자인 모드">
            <button
              type="button"
              className={`app-theme-btn ${designTheme === 'default' ? 'is-active' : ''}`}
              onClick={() => setDesignTheme('default')}
              aria-label="기본모드"
              title="기본모드"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </button>
            <button
              type="button"
              className={`app-theme-btn ${designTheme === 'light' ? 'is-active' : ''}`}
              onClick={() => setDesignTheme('light')}
              aria-label="라이트모드"
              title="라이트모드"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M4.93 4.93l1.41 1.41" />
                <path d="M17.66 17.66l1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="M4.93 19.07l1.41-1.41" />
                <path d="M17.66 6.34l1.41-1.41" />
              </svg>
            </button>
            <button
              type="button"
              className={`app-theme-btn ${designTheme === 'dark' ? 'is-active' : ''}`}
              onClick={() => setDesignTheme('dark')}
              aria-label="다크모드"
              title="다크모드"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            className="ui-tabs-trigger app-header-login"
            onClick={() => setActiveView('login')}
          >
            로그인
          </button>
        </div>
      </header>
      <Tabs value={activeView} onValueChange={setActiveView}>
        {menuViews.length > 0 && (
          <TabsList>
            {menuViews.map((view) => (
              <TabsTrigger key={view.id} value={view.id}>
                {view.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}
        <TabsContent value="search">
          <section className="view-panel">
            <div className="view-layout">
              <div className="view-main">
                <RecentSearches
                  items={recentSearches}
                  onSelect={(targetName) => {
                    setName(targetName)
                    search(targetName)
                  }}
                  onClear={clearRecentSearches}
                />
                <FavoriteCharacters
                  favorites={favorites}
                  onSelectCharacter={handleSelectCharacter}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                />
                <MainCharacterPanel
                  character={mainCharacter}
                  detail={mainDetail}
                  insight={
                    mainCharacter
                      ? combatInsightsByKey[
                          `${mainCharacter.CharacterName}:${mainCharacter.ServerName}`
                        ]
                      : null
                  }
                  loading={mainDetailLoading}
                  error={mainDetailError}
                  expeditionCharacters={Array.isArray(result) ? result : []}
                  sasageLoading={sasageLoading}
                  sasageWarning={sasageWarning}
                  sasagePosts={sasagePosts}
                />
                <CharacterResult
                  error={error}
                  result={result}
                  loading={loading}
                  combatInsightsByKey={combatInsightsByKey}
                  onSelectCharacter={handleSelectCharacter}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                />
                <CharacterComparePanel characters={availableCharacters} />
              </div>
              <aside className="view-aside">
                <div className="view-remote-card">
                  <h3 className="view-remote-title">캐릭터 검색</h3>
                  <p className="view-remote-desc">이름으로 검색하면 결과가 왼쪽에 표시됩니다.</p>
                  <CharacterSearchForm
                    name={name}
                    onNameChange={setName}
                    onSearch={search}
                    loading={loading}
                  />
                </div>
              </aside>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="homework" className="ui-tabs-content-homework">
          <HomeworkPanel onNavigateLogin={() => setActiveView('login')} />
        </TabsContent>

        <TabsContent value="market">
          <section className="view-panel">
            <div className="view-layout">
              <div className="view-main">
                <AuctionMarketPanel />
              </div>
              <aside className="view-aside">
                <div className="view-remote-card">
                  <h3 className="view-remote-title">경매장 추이</h3>
                  <p className="view-remote-desc">가격 추이를 확인할 수 있습니다.</p>
                </div>
              </aside>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="boss">
          <section className="view-panel">
            <div className="view-layout">
              <div className="view-main">
                <BossReadinessPanel characters={availableCharacters} />
              </div>
              <aside className="view-aside">
                <div className="view-remote-card">
                  <h3 className="view-remote-title">보스 준비도</h3>
                  <p className="view-remote-desc">캐릭터별 보스 준비 상태를 확인합니다.</p>
                </div>
              </aside>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="score">
          <section className="view-panel">
            <div className="view-layout">
              <div className="view-main">
                <ScoreRankPanel />
              </div>
              <aside className="view-aside">
                <div className="view-remote-card">
                  <h3 className="view-remote-title">점수·랭킹</h3>
                  <p className="view-remote-desc">점수와 랭킹 정보를 확인합니다.</p>
                </div>
              </aside>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="revenue">
          <section className="view-panel">
            <RevenueEfficiencyPanel />
          </section>
        </TabsContent>

        <TabsContent value="combat">
          <section className="view-panel">
            <div className="view-layout">
              <div className="view-main">
                <CombatCalcPanel />
              </div>
              <aside className="view-aside">
                <div className="view-remote-card">
                  <h3 className="view-remote-title">전투·계산</h3>
                  <p className="view-remote-desc">전투 관련 계산 도구입니다.</p>
                </div>
              </aside>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="login">
          <LoginScreen />
        </TabsContent>
      </Tabs>

      <CharacterDetailModal
        open={Boolean(selectedCharacter)}
        character={selectedCharacter}
        detail={detailData}
        loading={detailLoading}
        error={detailError}
        onClose={closeModal}
      />
    </main>
  )
}

export default App