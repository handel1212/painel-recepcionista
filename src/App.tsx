import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Pacientes from './pages/Pacientes'
import Consultas from './pages/Consultas'
import Agenda from './pages/Agenda'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="pacientes" element={<Pacientes />} />
          <Route path="consultas" element={<Consultas />} />
          <Route path="agenda" element={<Agenda />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
