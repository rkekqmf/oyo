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
  { id: 'search', label: '캐릭터 검색' },
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
  const [activeView, setActiveView] = useState('search')
  const adminClickCount = useRef(0)
  const adminClickTimer = useRef(null)

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
            <span className="app-logo-o">o</span>y<span className="app-logo-o">o</span>
          </h1>
          <p>로스트아크 캐릭터 정보를 빠르게 조회해보세요.</p>
        </div>
      </header>
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          {visibleViews.map((view) => (
            <TabsTrigger key={view.id} value={view.id}>
              {view.label}
            </TabsTrigger>
          ))}
        </TabsList>

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

        <TabsContent value="homework">
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