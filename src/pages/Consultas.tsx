import { useEffect, useState, useCallback } from 'react'
import {
  getConsultas,
  atualizarStatusConsulta,
  remarcarConsulta,
  notificarPaciente,
  Consulta,
  StatusConsulta,
} from '../lib/supabase'

type Filtro = StatusConsulta | 'todas'

const TABS: { key: Filtro; label: string }[] = [
  { key: 'todas',     label: 'Todas'      },
  { key: 'pendente',  label: 'Pendentes'  },
  { key: 'aprovada',  label: 'Aprovadas'  },
  { key: 'recusada',  label: 'Recusadas'  },
  { key: 'remarcada', label: 'Remarcadas' },
  { key: 'cancelada', label: 'Canceladas' },
]

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

export default function Consultas() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todas')

  // Remarcar modal state
  const [modalConsulta, setModalConsulta] = useState<Consulta | null>(null)
  const [novaData, setNovaData] = useState('')
  const [novoHorario, setNovoHorario] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getConsultas(filtro === 'todas' ? undefined : filtro)
      setConsultas(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar consultas')
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => { load() }, [load])

  async function handleStatus(id: string, status: StatusConsulta) {
    setError(null)
    const consulta = consultas.find((c) => c.id === id)
    try {
      await atualizarStatusConsulta(id, status)
      if (consulta) await notificarPaciente(consulta, status)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar status')
    }
  }

  function openModal(c: Consulta) {
    setModalConsulta(c)
    setNovaData(c.data_consulta)
    setNovoHorario(fmtTime(c.horario))
  }

  async function handleRemarcar() {
    if (!modalConsulta || !novaData || !novoHorario) return
    setSaving(true)
    try {
      await remarcarConsulta(modalConsulta.id, novaData, novoHorario)
      await notificarPaciente(modalConsulta, 'remarcada', novaData, novoHorario)
      setModalConsulta(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remarcar consulta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Consultas</h2>
        <p>Gerencie as solicitações de agendamento</p>
      </div>

      <div className="tabs">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`tab${filtro === key ? ' active' : ''}`}
            onClick={() => setFiltro(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading">Carregando…</div>
        ) : consultas.length === 0 ? (
          <div className="empty">Nenhuma consulta encontrada para este filtro.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Telefone</th>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Motivo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {consultas.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.nome_paciente}</strong>
                    </td>
                    <td>{c.telefone}</td>
                    <td>{fmtDate(c.data_consulta)}</td>
                    <td>{fmtTime(c.horario)}</td>
                    <td>{c.motivo ?? '—'}</td>
                    <td>
                      <span className={`badge badge-${c.status}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        {c.status === 'pendente' && (
                          <>
                            <button
                              className="btn btn-success"
                              onClick={() => handleStatus(c.id, 'aprovada')}
                            >
                              Aprovar
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleStatus(c.id, 'recusada')}
                            >
                              Recusar
                            </button>
                          </>
                        )}
                        {(c.status === 'pendente' || c.status === 'aprovada') && (
                          <button
                            className="btn btn-warning"
                            onClick={() => openModal(c)}
                          >
                            Remarcar
                          </button>
                        )}
                        {c.status === 'aprovada' && (
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleStatus(c.id, 'cancelada')}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Remarcar modal ── */}
      {modalConsulta && (
        <div className="modal-overlay" onClick={() => setModalConsulta(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Remarcar Consulta</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
              Paciente: <strong>{modalConsulta.nome_paciente}</strong>
            </p>
            <div className="form-group">
              <label htmlFor="nova-data">Nova Data</label>
              <input
                id="nova-data"
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="novo-horario">Novo Horário</label>
              <input
                id="novo-horario"
                type="time"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalConsulta(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRemarcar}
                disabled={saving || !novaData || !novoHorario}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
