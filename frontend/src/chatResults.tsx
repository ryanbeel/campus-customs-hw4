import { createContext, useContext, useState, type ReactNode } from 'react'
import { fetchSearchPage, fetchSurprise, type SearchResults } from './api'

/** Shared state for chat search results shown on the page. */
interface ChatResultsState {
  results: SearchResults | null
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  loadingMore: boolean
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  showResults: (results: SearchResults) => void
  loadMore: () => Promise<void>
  surprise: () => Promise<void>
  clearResults: () => void
}

const ChatResultsContext = createContext<ChatResultsState | null>(null)

export function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  function showResults(next: SearchResults) {
    setResults(next)
    setCollapsed(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function loadMore() {
    if (!results || !results.has_more || loadingMore) return
    setLoadingMore(true)
    setCollapsed(false)
    try {
      const page = await fetchSearchPage(results, results.products.length, results.limit)
      setResults({ ...page, offset: 0, products: [...results.products, ...page.products] })
    } finally {
      setLoadingMore(false)
    }
  }

  /** "Surprise me": 5 random products from 5 different categories. */
  async function surprise() {
    setLoadingMore(true)
    try {
      showResults(await fetchSurprise())
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <ChatResultsContext.Provider
      value={{ results, collapsed, setCollapsed, loadingMore, surprise, chatOpen, setChatOpen, showResults, loadMore, clearResults: () => setResults(null) }}
    >
      {children}
    </ChatResultsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChatResults() {
  const ctx = useContext(ChatResultsContext)
  if (!ctx) throw new Error('useChatResults must be used inside ChatResultsProvider')
  return ctx
}
