import { Button } from './ui/button'
import { Input } from './ui/input'

export function CharacterSearchForm({ name, onNameChange, onSearch, loading }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(name)
  }

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="캐릭터명 입력"
        className="search-input"
      />
      <Button type="submit" disabled={loading} className="search-button">
        {loading ? '조회중...' : '조회'}
      </Button>
    </form>
  )
}
