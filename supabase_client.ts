// =====================================================================
// lib/supabase.ts
// Cliente Supabase + tipos + funções de acesso a dados para o painel
// administrativo (React + Vite + TypeScript).
//
// Requer: npm install @supabase/supabase-js
// E as variáveis de ambiente (arquivo .env na raiz do projeto Vite):
//   VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
//   VITE_SUPABASE_ANON_KEY=sua_anon_key
// =====================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------------
// Tipos (espelham as tabelas do schema SQL)
// ---------------------------------------------------------------------
export interface Paciente {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  observacoes?: string | null;
  data_criacao: string;
}

export type StatusConsulta = 'pendente' | 'aprovada' | 'recusada' | 'remarcada' | 'cancelada';

export interface Consulta {
  id: string;
  paciente_id: string | null;
  nome_paciente: string;
  telefone: string;
  data_consulta: string; // YYYY-MM-DD
  horario: string;       // HH:MM:SS
  status: StatusConsulta;
  motivo?: string | null;
  observacoes?: string | null;
  data_criacao: string;
}

export interface HorarioDisponivel {
  id: string;
  data: string;
  horario: string;
  disponivel: boolean;
  data_criacao: string;
}

export interface DashboardStats {
  total_pacientes: number;
  consultas_pre_marcadas: number;
  consultas_aprovadas: number;
  consultas_recusadas: number;
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.from('vw_dashboard_stats').select('*').single();
  if (error) throw error;
  return data as DashboardStats;
}

export async function getUltimasSolicitacoes(limit = 5): Promise<Consulta[]> {
  const { data, error } = await supabase
    .from('consultas')
    .select('*')
    .order('data_criacao', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------
// Pacientes
// ---------------------------------------------------------------------
export async function getPacientes(): Promise<Paciente[]> {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .order('data_criacao', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------
export async function getConsultas(status?: StatusConsulta): Promise<Consulta[]> {
  let query = supabase.from('consultas').select('*').order('data_consulta', { ascending: true });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function atualizarStatusConsulta(id: string, status: StatusConsulta): Promise<void> {
  const { error } = await supabase.from('consultas').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function remarcarConsulta(
  id: string,
  novaData: string,
  novoHorario: string
): Promise<void> {
  // 1. Busca a consulta atual para liberar o horário antigo
  const { data: consultaAtual, error: errBusca } = await supabase
    .from('consultas')
    .select('data_consulta, horario')
    .eq('id', id)
    .single();
  if (errBusca) throw errBusca;

  // 2. Libera o horário antigo, se existir
  if (consultaAtual) {
    await supabase
      .from('horarios_disponiveis')
      .update({ disponivel: true })
      .eq('data', consultaAtual.data_consulta)
      .eq('horario', consultaAtual.horario);
  }

  // 3. Marca o novo horário como indisponível
  await supabase
    .from('horarios_disponiveis')
    .update({ disponivel: false })
    .eq('data', novaData)
    .eq('horario', novoHorario);

  // 4. Atualiza a consulta com a nova data/horário e status
  const { error } = await supabase
    .from('consultas')
    .update({ data_consulta: novaData, horario: novoHorario, status: 'remarcada' })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------
export async function getHorariosDisponiveis(data?: string): Promise<HorarioDisponivel[]> {
  let query = supabase
    .from('horarios_disponiveis')
    .select('*')
    .order('data', { ascending: true })
    .order('horario', { ascending: true });
  if (data) query = query.eq('data', data);
  const { data: result, error } = await query;
  if (error) throw error;
  return result ?? [];
}

export async function getConsultasPorData(data: string): Promise<Consulta[]> {
  const { data: result, error } = await supabase
    .from('consultas')
    .select('*')
    .eq('data_consulta', data)
    .order('horario', { ascending: true });
  if (error) throw error;
  return result ?? [];
}

// ---------------------------------------------------------------------
// Exemplo de uso em um componente React:
//
// useEffect(() => {
//   getDashboardStats().then(setStats).catch(console.error);
// }, []);
// ---------------------------------------------------------------------
