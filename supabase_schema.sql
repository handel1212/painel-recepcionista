-- =====================================================================
-- Recepcionista Virtual com IA para Clínicas de Psicologia
-- Schema do banco de dados (Supabase / PostgreSQL)
-- =====================================================================
-- Como usar: cole este script inteiro no SQL Editor do Supabase
-- (Project > SQL Editor > New query) e clique em "Run".
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tabela: pacientes
-- ---------------------------------------------------------------------
create table if not exists pacientes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  telefone      text not null unique,
  email         text,
  observacoes   text,
  data_criacao  timestamptz not null default now()
);

comment on table pacientes is 'Pacientes que já entraram em contato pelo WhatsApp';

-- ---------------------------------------------------------------------
-- Tabela: horarios_disponiveis
-- ---------------------------------------------------------------------
create table if not exists horarios_disponiveis (
  id            uuid primary key default gen_random_uuid(),
  data          date not null,
  horario       time not null,
  disponivel    boolean not null default true,
  data_criacao  timestamptz not null default now(),
  unique (data, horario)
);

comment on table horarios_disponiveis is 'Grade de horários que a clínica oferece para pré-agendamento';

-- ---------------------------------------------------------------------
-- Tabela: consultas
-- ---------------------------------------------------------------------
create table if not exists consultas (
  id              uuid primary key default gen_random_uuid(),
  paciente_id     uuid references pacientes(id) on delete set null,
  nome_paciente   text not null,
  telefone        text not null,
  data_consulta   date not null,
  horario         time not null,
  status          text not null default 'pendente'
                  check (status in ('pendente', 'aprovada', 'recusada', 'remarcada', 'cancelada')),
  motivo          text,
  observacoes     text,
  data_criacao    timestamptz not null default now()
);

comment on table consultas is 'Solicitações de pré-agendamento feitas via WhatsApp/IA';

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
create index if not exists idx_consultas_status     on consultas(status);
create index if not exists idx_consultas_data        on consultas(data_consulta);
create index if not exists idx_pacientes_telefone    on pacientes(telefone);
create index if not exists idx_horarios_disponivel   on horarios_disponiveis(disponivel);

-- ---------------------------------------------------------------------
-- View para alimentar o Dashboard do painel React
-- ---------------------------------------------------------------------
create or replace view vw_dashboard_stats as
select
  (select count(*) from pacientes)                              as total_pacientes,
  (select count(*) from consultas where status = 'pendente')    as consultas_pre_marcadas,
  (select count(*) from consultas where status = 'aprovada')    as consultas_aprovadas,
  (select count(*) from consultas where status = 'recusada')    as consultas_recusadas;

-- ---------------------------------------------------------------------
-- RLS (Row Level Security)
-- ---------------------------------------------------------------------
-- Projeto acadêmico, sem autenticação multiusuário: RLS desabilitado
-- de propósito para simplificar a apresentação. Em produção real,
-- isso precisaria de políticas adequadas + autenticação.
alter table pacientes              disable row level security;
alter table consultas              disable row level security;
alter table horarios_disponiveis   disable row level security;

-- =====================================================================
-- (Opcional) Seed: gera horários disponíveis para os próximos 7 dias,
-- das 08:00 às 17:00, de hora em hora, pulando sábado e domingo.
-- Execute separadamente se quiser dados de exemplo para a demonstração.
-- =====================================================================
-- insert into horarios_disponiveis (data, horario)
-- select d::date, h::time
-- from generate_series(current_date, current_date + interval '7 days', interval '1 day') d,
--      generate_series(8, 17) h
-- where extract(isodow from d) not in (6, 7)
-- on conflict (data, horario) do nothing;
