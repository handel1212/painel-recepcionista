import { useEffect, useState } from 'react'
import { getPacientes, Paciente } from '../lib/supabase'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPacientes()
      .then(setPacientes)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Carregando pacientes…</div>
  if (error) return <div className="error-msg">{error}</div>

  const plural = pacientes.length !== 1

  return (
    <div>
      <div className="page-header">
        <h2>Pacientes</h2>
        <p>
          {pacientes.length} paciente{plural ? 's' : ''} cadastrado{plural ? 's' : ''}
        </p>
      </div>

      <div className="card">
        {pacientes.length === 0 ? (
          <div className="empty">Nenhum paciente cadastrado ainda.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th>Observações</th>
                  <th>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.nome}</strong>
                    </td>
                    <td>{p.telefone}</td>
                    <td>{p.email ?? '—'}</td>
                    <td>{p.observacoes ?? '—'}</td>
                    <td>{fmtDate(p.data_criacao)}</td>
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
