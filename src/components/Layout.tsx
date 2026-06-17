import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/dashboard', label: 'Dashboard',  icon: '📊' },
  { to: '/pacientes', label: 'Pacientes',  icon: '👥' },
  { to: '/consultas', label: 'Consultas',  icon: '📋' },
  { to: '/agenda',    label: 'Agenda',     icon: '📅' },
]

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>🧠 Recepcionista<br />Virtual</h1>
          <p>Painel Administrativo</p>
        </div>
        <nav>
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
