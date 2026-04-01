import { Route, Routes } from 'react-router-dom'
import { GraphApp } from './GraphApp'
import { WorkPage } from './WorkPage'

export function App() {
  return (
    <Routes>
      <Route path="/works/:slug" element={<WorkPage />} />
      <Route path="*" element={<GraphApp />} />
    </Routes>
  )
}
