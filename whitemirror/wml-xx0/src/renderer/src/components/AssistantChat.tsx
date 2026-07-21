import { useEffect, useState, type FormEvent } from 'react'
import type { ReactElement } from 'react'
import type { AppState, AssistantAction, AssistantChatResult } from '../../../preload/index'
import { getTranslations } from '../i18n'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  source?: AssistantChatResult['source']
  action?: AssistantAction
}

export default function AssistantChat(): ReactElement {
  const [state, setState] = useState<AppState | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (!window.wml) {
      console.error('[assistant] window.wml is missing: check this BrowserWindow preload')
      return
    }

    window.wml.getState().then(setState)
    const unsubscribe = window.wml.onStateUpdated(setState)

    return () => unsubscribe()
  }, [])

  const text = getTranslations(state?.settings.language)

  const sendMessage = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    const message = draft.trim()
    if (!message || isSending) {
      return
    }

    setDraft('')
    setIsSending(true)
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: message }])

    try {
      const response = await window.wml.askAssistant(message)
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: response.message,
          source: response.source,
          action: response.action
        }
      ])
    } finally {
      setIsSending(false)
    }
  }

  const applyAction = async (action: AssistantAction): Promise<void> => {
    await window.wml.applyAssistantAction(action.id)
    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        role: 'assistant',
        text: `${action.label}: ${action.description}`,
        source: 'local'
      }
    ])
  }

  return (
    <div className="app-shell assistant-shell">
      <main className="assistant-workspace">
        <header className="assistant-header">
          <span>{state?.settings.lunaEnabled ? text.chatLuna : text.chatLocalFallback}</span>
          <h1>{text.assistant}</h1>
        </header>

        <section className="assistant-thread">
          {messages.map((message) => (
            <article className={`chat-bubble ${message.role}`} key={message.id}>
              {message.source && (
                <span>{message.source === 'luna' ? text.chatLuna : text.chatLocalFallback}</span>
              )}
              <p>{message.text}</p>
              {message.action && (
                <div className="assistant-action-card">
                  <small>{text.proposedAction}</small>
                  <strong>{message.action.label}</strong>
                  <p>{message.action.description}</p>
                  <button type="button" onClick={() => applyAction(message.action!)}>
                    {text.applyAction}
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>

        <form className="assistant-composer" onSubmit={sendMessage}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={text.chatPlaceholder}
            maxLength={1200}
          />
          <button type="submit" disabled={isSending || draft.trim().length === 0}>
            {text.send}
          </button>
        </form>
      </main>
    </div>
  )
}
