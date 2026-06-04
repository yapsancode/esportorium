import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import TournamentDetail from '@/pages/TournamentDetail'
import Submit from '@/pages/Submit'
import AdminLogin from '@/pages/admin/Login'
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminTournaments from '@/pages/admin/Tournaments'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tournament/:id" element={<TournamentDetail />} />
        <Route path="/submit" element={<Submit />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/tournaments" element={<AdminTournaments />} />
      </Routes>
    </BrowserRouter>
  )
}
