import { useEffect, useState } from 'react'
import {
  getHorariosDisponiveis,
  getConsultasPorData,
  HorarioDisponivel,
  Consulta,
} from '../lib/supabase'

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  remarcada: 'Remarcada',
  cancelada: 'Cancelada',
}

function todayISO() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function fmtTime(t: string) {
  return t.substring(0, 5)
}

export default function Agenda() {
  const [dataSel, setDataSel] = useState(todayISO)
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>([])
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([getHorariosDisponiveis(dataSel), getConsultasPorData(dataSel)])
      .then(([h, c]) => {
        setHorarios(h)
        setConsultas(c)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [dataSel])

  // Map horário (HH:MM) → consulta para exibir no slot
  const consultaMap: Record<string, Consulta> = {}
  consultas.forEach((c) => {
    consultaMap[fmtTime(c.horario)] = c
  })

  return (
    <div>
      <div className="page-header">
        <h2>Agenda</h2>
        <p>Horários disponíveis e consultas por data</p>
      </div>

      <div className="date-picker-row">
        <label htmlFor="data-agenda">Data:</label>
        <input
          id="data-agenda"
          type="date"
          value={dataSel}
          onChange={(e) => setDataSel(e.target.value)}
        />
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div className="loading">Carregando agenda…</div>
      ) : (
        <>
          {/* ── Grade de horários ── */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <p className="section-title">
              Grade de Horários{' '}
              <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.8125rem' }}>
                ({horarios.length} slot{horarios.length !== 1 ? 's' : ''})
              </span>
            </p>

            {horarios.length === 0 ? (
              <div className="empty">
                Nenhum horário cadastrado para esta data.
                <br />
                <span style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Use o seed do schema SQL para gerar horários de exemplo.
                </span>
              </div>
            ) : (
              <div className="agenda-grid">
                {horarios.map((h) => {
                  const hora = fmtTime(h.horario)
                  const consulta = consultaMap[hora]
                  const ocupado = !h.disponivel || !!consulta
                  return (
                    <div
                      key={h.id}
                      className={`horario-slot ${ocupado ? 'ocupado' : 'disponivel'}`}
                    >
                      <strong>{hora}</strong>
                      {consulta ? (
                        <>
                          <div className="slot-name">{consulta.nome_paciente}</div>
                          <span
                            className={`badge badge-${consulta.status}`}
                            style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}
                          >
                            {STATUS_LABELS[consulta.status]}
                          </span>
                        </>
                      ) : (
                        <div className="slot-name">{h.disponivel ? 'Livre' : 'Bloqueado'}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Tabela de consultas do dia ── */}
          <div className="card">
            <p className="section-title">
              Consultas do Dia ({consultas.length})
            </p>

            {consultas.length === 0 ? (
              <div className="empty">Nenhuma consulta agendada para esta data.</div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Horário</th>
                      <th>Paciente</th>
                      <th>Telefone</th>
                      <th>Status</th>
                      <th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultas.map((c) => (
                      <tr key={c.id}>
                        <td>{fmtTime(c.horario)}</td>
                        <td>
                          <strong>{c.nome_paciente}</strong>
                        </td>
                        <td>{c.telefone}</td>
                        <td>
                          <span className={`badge badge-${c.status}`}>
                            {STATUS_LABELS[c.status] ?? c.status}
                          </span>
                        </td>
                        <td>{c.observacoes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
