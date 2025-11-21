import React, { useEffect } from 'react'
import AlarmApp from './components/AlarmApp'

function App() {
  useEffect(() => {
    // Register service worker for PWA/offline
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(()=>{})
    }
  }, [])

  return (
    <AlarmApp />
  )
}

export default App
