import { useEffect, useState } from 'react'
import {
  getDashboardStats,
  getUltimasSolicitacoes,
  DashboardStats,
  Consulta,
} from '../lib/supabase'

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  remarcada: 'Remarcada',
  cancelada: 'Cancelada',
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
function fmtTime(t: string) {
  return t.substring(0, 5)
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentes, setRecentes] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [s, r] = await Promise.all([
          getDashboardStats(),
          getUltimasSolicitacoes(8),
        ])
        setStats(s)
        setRecentes(r)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="loading">Carregando…</div>
  if (error) return <div className="error-msg">{error}</div>

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Visão geral do atendimento</p>
      </div>

      <div className="stats-grid">
        <div className="card stat-card total">
          <span className="stat-label">Total de Pacientes</span>
          <span className="stat-value">{stats?.total_pacientes ?? 0}</span>
        </div>
        <div className="card stat-card pend">
          <span className="stat-label">Consultas Pendentes</span>
          <span className="stat-value">{stats?.consultas_pre_marcadas ?? 0}</span>
        </div>
        <div className="card stat-card aprov">
          <span className="stat-label">Consultas Aprovadas</span>
          <span className="stat-value">{stats?.consultas_aprovadas ?? 0}</span>
        </div>
        <div className="card stat-card recus">
          <span className="stat-label">Consultas Recusadas</span>
          <span className="stat-value">{stats?.consultas_recusadas ?? 0}</span>
        </div>
      </div>

      <div className="card">
        <p className="section-title">Últimas Solicitações</p>
        {recentes.length === 0 ? (
          <div className="empty">Nenhuma solicitação registrada ainda.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Telefone</th>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.nome_paciente}</strong>
                    </td>
                    <td>{c.telefone}</td>
                    <td>{fmtDate(c.data_consulta)}</td>
                    <td>{fmtTime(c.horario)}</td>
                    <td>
                      <span className={`badge badge-${c.status}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
