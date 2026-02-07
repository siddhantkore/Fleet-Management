import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ContactPage from './pages/ContactPage'
import LiveTrackingPage from './pages/LiveTrackingPage'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/tracking" element={<LiveTrackingPage />} />
      </Routes>
    </Router>
  )
}

export default App
