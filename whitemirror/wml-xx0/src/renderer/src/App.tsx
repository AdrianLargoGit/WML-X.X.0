import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import Widget from './components/Widget'
import Settings from './components/Settings'
import AssistantChat from './components/AssistantChat'

function getRoute(): string {
  return window.location.hash.replace(/^#\/?/, '') || 'widget'
}

function App(): ReactElement {
  const [route, setRoute] = useState(getRoute())

  useEffect(() => {
    const onHashChange = (): void => setRoute(getRoute())
    window.addEventListener('hashchange', onHashChange)

    const unsubscribeNavigate = window.wml?.onNavigate((nextRoute) => {
      window.location.hash = `/${nextRoute}`
      setRoute(nextRoute as string)
    })

    return () => {
      window.removeEventListener('hashchange', onHashChange)
      unsubscribeNavigate?.()
    }
  }, [])

  if (route === 'settings') {
    return <Settings />
  }

  if (route === 'chat') {
    return <AssistantChat />
  }

  return <Widget />
}

export default App
