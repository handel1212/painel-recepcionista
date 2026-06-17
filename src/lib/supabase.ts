// =====================================================================
// lib/supabase.ts
// Cliente Supabase + tipos + funções de acesso a dados para o painel
// administrativo (React + Vite + TypeScript).
// =====================================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ---------------------------------------------------------------------
// Tipos (espelham as tabelas do schema SQL)
// ---------------------------------------------------------------------
export interface Paciente {
  id: string
  nome: string
  telefone: string
  email?: string | null
  observacoes?: string | null
  data_criacao: string
}

export type StatusConsulta = 'pendente' | 'aprovada' | 'recusada' | 'remarcada' | 'cancelada'

export interface Consulta {
  id: string
  paciente_id: string | null
  nome_paciente: string
  telefone: string
  data_consulta: string // YYYY-MM-DD
  horario: string       // HH:MM:SS
  status: StatusConsulta
  motivo?: string | null
  observacoes?: string | null
  data_criacao: string
}

export interface HorarioDisponivel {
  id: string
  data: string
  horario: string
  disponivel: boolean
  data_criacao: string
}

export interface DashboardStats {
  total_pacientes: number
  consultas_pre_marcadas: number
  consultas_aprovadas: number
  consultas_recusadas: number
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.from('vw_dashboard_stats').select('*').single()
  if (error) throw error
  return data as DashboardStats
}

export async function getUltimasSolicitacoes(limit = 5): Promise<Consulta[]> {
  const { data, error } = await supabase
    .from('consultas')
    .select('*')
    .order('data_criacao', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------
// Pacientes
// ---------------------------------------------------------------------
export async function getPacientes(): Promise<Paciente[]> {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .order('data_criacao', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------
export async function getConsultas(status?: StatusConsulta): Promise<Consulta[]> {
  let query = supabase.from('consultas').select('*').order('data_consulta', { ascending: true })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function atualizarStatusConsulta(id: string, status: StatusConsulta): Promise<void> {
  const { error } = await supabase.from('consultas').update({ status }).eq('id', id)
  if (error) throw error
}

export async function remarcarConsulta(
  id: string,
  novaData: string,
  novoHorario: string,
): Promise<void> {
  // 1. Busca a consulta atual para liberar o horário antigo
  const { data: consultaAtual, error: errBusca } = await supabase
    .from('consultas')
    .select('data_consulta, horario')
    .eq('id', id)
    .single()
  if (errBusca) throw errBusca

  // 2. Libera o horário antigo, se existir
  if (consultaAtual) {
    await supabase
      .from('horarios_disponiveis')
      .update({ disponivel: true })
      .eq('data', consultaAtual.data_consulta)
      .eq('horario', consultaAtual.horario)
  }

  // 3. Marca o novo horário como indisponível
  await supabase
    .from('horarios_disponiveis')
    .update({ disponivel: false })
    .eq('data', novaData)
    .eq('horario', novoHorario)

  // 4. Atualiza a consulta com a nova data/horário e status
  const { error } = await supabase
    .from('consultas')
    .update({ data_consulta: novaData, horario: novoHorario, status: 'remarcada' })
    .eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------
export async function getHorariosDisponiveis(data?: string): Promise<HorarioDisponivel[]> {
  let query = supabase
    .from('horarios_disponiveis')
    .select('*')
    .order('data', { ascending: true })
    .order('horario', { ascending: true })
  if (data) query = query.eq('data', data)
  const { data: result, error } = await query
  if (error) throw error
  return result ?? []
}

export async function getConsultasPorData(data: string): Promise<Consulta[]> {
  const { data: result, error } = await supabase
    .from('consultas')
    .select('*')
    .eq('data_consulta', data)
    .order('horario', { ascending: true })
  if (error) throw error
  return result ?? []
}

// ---------------------------------------------------------------------
// Notificações WhatsApp via WAHA
// ---------------------------------------------------------------------
function _fmtDateBR(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function _fmtTimeShort(t: string) {
  return t.substring(0, 5)
}

const _MENSAGENS: Record<string, (nome: string, data: string, h: string) => string> = {
  aprovada:  (n, d, h) => `✅ Olá, ${n}! Sua consulta foi *confirmada* para ${d} às ${h}. Aguardamos você na Clínica Equilíbrio! 😊`,
  recusada:  (n, d, h) => `Olá, ${n}. Infelizmente não foi possível confirmar sua consulta para ${d} às ${h}. Entre em contato para remarcar: (34) 99999-9999.`,
  cancelada: (n, d, h) => `Olá, ${n}. Sua consulta do dia ${d} às ${h} foi cancelada. Em caso de dúvidas, ligue: (34) 99999-9999.`,
  remarcada: (n, d, h) => `📅 Olá, ${n}! Sua consulta foi *remarcada* para ${d} às ${h}. Qualquer dúvida, estamos à disposição.`,
}

export async function notificarPaciente(
  consulta: Consulta,
  novoStatus: StatusConsulta,
  novaData?: string,
  novoHorario?: string,
): Promise<void> {
  const fn = _MENSAGENS[novoStatus]
  if (!fn) return

  const data    = _fmtDateBR(novaData ?? consulta.data_consulta)
  const horario = _fmtTimeShort(novoHorario ?? consulta.horario)
  const texto   = fn(consulta.nome_paciente, data, horario)
  const chatId  = `${consulta.telefone.replace(/\D/g, '')}@c.us`

  const wahaBase = import.meta.env.VITE_WAHA_URL ?? '/waha'
  await fetch(`${wahaBase}/api/sendText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: 'default', chatId, text: texto }),
  })
}
