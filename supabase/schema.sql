-- =====================================================================
-- FutBet — schema completo (cole tudo no SQL Editor do Supabase e rode)
-- Dinheiro fictício: FutCoins (MJ$). Toda a lógica de saldo roda aqui
-- no banco, via funções security definer — o cliente nunca altera saldo.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tabelas ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  balance numeric(12,2) not null default 1000 check (balance >= 0),
  last_bonus_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  home_team text not null check (char_length(home_team) between 1 and 40),
  away_team text not null check (char_length(away_team) between 1 and 40),
  description text,
  location text,
  starts_at timestamptz,
  status text not null default 'open' check (status in ('open','locked','finished','cancelled')),
  home_score int,
  away_score int,
  created_at timestamptz not null default now()
);

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  is_main boolean not null default false,
  position int not null default 0,
  status text not null default 'open' check (status in ('open','settled','void')),
  created_at timestamptz not null default now()
);

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  odd numeric(8,2) not null check (odd >= 1.01 and odd <= 1000),
  position int not null default 0,
  is_winner boolean
);

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  option_id uuid not null references public.options(id) on delete cascade,
  stake numeric(12,2) not null check (stake > 0),
  odd numeric(8,2) not null,
  status text not null default 'pending' check (status in ('pending','won','lost','void')),
  payout numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists markets_game_idx on public.markets(game_id);
create index if not exists options_market_idx on public.options(market_id);
create index if not exists bets_game_idx on public.bets(game_id);
create index if not exists bets_user_idx on public.bets(user_id);
create index if not exists bets_option_idx on public.bets(option_id);
create index if not exists comments_game_idx on public.comments(game_id);

-- ---------- Perfil automático ao criar conta (saldo inicial MJ$ 1000) ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- RLS: todos leem, ninguém escreve direto (exceto comentários) ----------
alter table public.profiles enable row level security;
alter table public.games    enable row level security;
alter table public.markets  enable row level security;
alter table public.options  enable row level security;
alter table public.bets     enable row level security;
alter table public.comments enable row level security;

drop policy if exists "read profiles" on public.profiles;
drop policy if exists "read games" on public.games;
drop policy if exists "read markets" on public.markets;
drop policy if exists "read options" on public.options;
drop policy if exists "read bets" on public.bets;
drop policy if exists "read comments" on public.comments;
drop policy if exists "insert own comment" on public.comments;
drop policy if exists "delete own comment" on public.comments;

create policy "read profiles" on public.profiles for select using (true);
create policy "read games"    on public.games    for select using (true);
create policy "read markets"  on public.markets  for select using (true);
create policy "read options"  on public.options  for select using (true);
create policy "read bets"     on public.bets     for select using (true);
create policy "read comments" on public.comments for select using (true);
create policy "insert own comment" on public.comments for insert to authenticated
  with check (auth.uid() = user_id);
create policy "delete own comment" on public.comments for delete to authenticated
  using (auth.uid() = user_id);

-- ---------- Helpers internos ----------
create or replace function public._assert_creator(p_game_id uuid)
returns public.games language plpgsql security definer set search_path = public as $$
declare v_game public.games;
begin
  if auth.uid() is null then raise exception 'Faça login para continuar'; end if;
  select * into v_game from games where id = p_game_id for update;
  if not found then raise exception 'Jogo não encontrado'; end if;
  if v_game.creator_id <> auth.uid() then raise exception 'Apenas o criador do jogo pode fazer isso'; end if;
  return v_game;
end $$;

create or replace function public._insert_market(p_game_id uuid, p_market jsonb, p_position int, p_is_main boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_market uuid; o jsonb; j int := 0;
begin
  if coalesce(trim(p_market->>'title'), '') = '' then raise exception 'Todo mercado precisa de um título'; end if;
  if jsonb_array_length(coalesce(p_market->'options', '[]'::jsonb)) < 2 then
    raise exception 'O mercado "%" precisa de pelo menos 2 opções', p_market->>'title';
  end if;
  insert into markets (game_id, title, is_main, position)
  values (p_game_id, trim(p_market->>'title'), p_is_main, p_position) returning id into v_market;
  for o in select * from jsonb_array_elements(p_market->'options') loop
    if coalesce(trim(o->>'label'), '') = '' then raise exception 'Toda opção precisa de um nome'; end if;
    if (o->>'odd')::numeric < 1.01 then raise exception 'Odds precisam ser no mínimo 1.01'; end if;
    insert into options (market_id, label, odd, position)
    values (v_market, trim(o->>'label'), round((o->>'odd')::numeric, 2), j);
    j := j + 1;
  end loop;
  return v_market;
end $$;

create or replace function public._settle_market(p_market_id uuid, p_option_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update options set is_winner = (id = p_option_id) where market_id = p_market_id;
  update markets set status = 'settled' where id = p_market_id;
  with won as (
    update bets set status = 'won', payout = round(stake * odd, 2), settled_at = now()
    where option_id = p_option_id and status = 'pending'
    returning user_id, payout
  )
  update profiles p set balance = p.balance + w.total
  from (select user_id, sum(payout) as total from won group by user_id) w
  where p.id = w.user_id;
  update bets set status = 'lost', payout = 0, settled_at = now()
  where market_id = p_market_id and status = 'pending';
end $$;

create or replace function public._void_market(p_market_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update markets set status = 'void' where id = p_market_id;
  with refunded as (
    update bets set status = 'void', payout = stake, settled_at = now()
    where market_id = p_market_id and status = 'pending'
    returning user_id, stake
  )
  update profiles p set balance = p.balance + r.total
  from (select user_id, sum(stake) as total from refunded group by user_id) r
  where p.id = r.user_id;
end $$;

-- ---------- API pública (RPC) ----------

-- Cria jogo + mercado principal (Casa/Empate/Fora) + mercados extras
create or replace function public.create_game(
  p_home text, p_away text, p_description text, p_location text,
  p_starts_at timestamptz, p_main jsonb, p_extras jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_game uuid; m jsonb; i int := 1;
begin
  if auth.uid() is null then raise exception 'Faça login para criar um jogo'; end if;
  if coalesce(trim(p_home), '') = '' or coalesce(trim(p_away), '') = '' then
    raise exception 'Informe os dois times';
  end if;
  insert into games (creator_id, home_team, away_team, description, location, starts_at)
  values (auth.uid(), trim(p_home), trim(p_away), nullif(trim(p_description), ''), nullif(trim(p_location), ''), p_starts_at)
  returning id into v_game;

  perform _insert_market(v_game, p_main, 0, true);
  for m in select * from jsonb_array_elements(coalesce(p_extras, '[]'::jsonb)) loop
    perform _insert_market(v_game, m, i, false);
    i := i + 1;
  end loop;
  return v_game;
end $$;

create or replace function public.add_market(p_game_id uuid, p_market jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_game public.games; v_pos int;
begin
  v_game := _assert_creator(p_game_id);
  if v_game.status in ('finished','cancelled') then raise exception 'Este jogo já foi encerrado'; end if;
  select coalesce(max(position), 0) + 1 into v_pos from markets where game_id = p_game_id;
  return _insert_market(p_game_id, p_market, v_pos, false);
end $$;

create or replace function public.update_odd(p_option_id uuid, p_odd numeric)
returns void language plpgsql security definer set search_path = public as $$
declare v_market public.markets;
begin
  select m.* into v_market from markets m join options o on o.market_id = m.id where o.id = p_option_id;
  if not found then raise exception 'Opção não encontrada'; end if;
  perform _assert_creator(v_market.game_id);
  if v_market.status <> 'open' then raise exception 'Mercado já encerrado'; end if;
  if p_odd is null or p_odd < 1.01 or p_odd > 1000 then raise exception 'Odd inválida (mín. 1.01)'; end if;
  update options set odd = round(p_odd, 2) where id = p_option_id;
end $$;

-- Faz uma aposta: debita o saldo e congela a odd do momento
create or replace function public.place_bet(p_option_id uuid, p_stake numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_opt public.options; v_market public.markets; v_game public.games;
  v_balance numeric; v_bet uuid; v_stake numeric := round(p_stake, 2);
begin
  if auth.uid() is null then raise exception 'Faça login para apostar'; end if;
  if v_stake is null or v_stake < 1 then raise exception 'Aposta mínima: MJ$ 1,00'; end if;

  select * into v_opt from options where id = p_option_id;
  if not found then raise exception 'Opção não encontrada'; end if;
  select * into v_market from markets where id = v_opt.market_id;
  select * into v_game from games where id = v_market.game_id;

  if v_game.creator_id = auth.uid() then raise exception 'Você não pode apostar no jogo que criou'; end if;
  if v_game.status <> 'open' then raise exception 'Apostas encerradas para este jogo'; end if;
  if v_game.starts_at is not null and v_game.starts_at <= now() then raise exception 'O jogo já começou — apostas encerradas'; end if;
  if v_market.status <> 'open' then raise exception 'Este mercado já foi encerrado'; end if;

  select balance into v_balance from profiles where id = auth.uid() for update;
  if v_balance < v_stake then raise exception 'Saldo insuficiente'; end if;

  update profiles set balance = balance - v_stake where id = auth.uid();
  insert into bets (user_id, game_id, market_id, option_id, stake, odd)
  values (auth.uid(), v_game.id, v_market.id, v_opt.id, v_stake, v_opt.odd)
  returning id into v_bet;
  return v_bet;
end $$;

create or replace function public.settle_market(p_market_id uuid, p_option_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_market public.markets;
begin
  select * into v_market from markets where id = p_market_id;
  if not found then raise exception 'Mercado não encontrado'; end if;
  perform _assert_creator(v_market.game_id);
  if v_market.status <> 'open' then raise exception 'Mercado já encerrado'; end if;
  if not exists (select 1 from options where id = p_option_id and market_id = p_market_id) then
    raise exception 'Opção inválida para este mercado';
  end if;
  perform _settle_market(p_market_id, p_option_id);
end $$;

create or replace function public.void_market(p_market_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_market public.markets;
begin
  select * into v_market from markets where id = p_market_id;
  if not found then raise exception 'Mercado não encontrado'; end if;
  perform _assert_creator(v_market.game_id);
  if v_market.status <> 'open' then raise exception 'Mercado já encerrado'; end if;
  perform _void_market(p_market_id);
end $$;

-- Abre/fecha apostas
create or replace function public.set_betting_open(p_game_id uuid, p_open boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_game public.games;
begin
  v_game := _assert_creator(p_game_id);
  if v_game.status in ('finished','cancelled') then raise exception 'Este jogo já foi encerrado'; end if;
  update games set status = case when p_open then 'open' else 'locked' end where id = p_game_id;
end $$;

-- Encerra o jogo com o placar e liquida automaticamente o mercado principal
create or replace function public.finish_game(p_game_id uuid, p_home int, p_away int)
returns void language plpgsql security definer set search_path = public as $$
declare v_game public.games; v_market uuid; v_opt uuid;
begin
  v_game := _assert_creator(p_game_id);
  if v_game.status in ('finished','cancelled') then raise exception 'Este jogo já foi encerrado'; end if;
  if p_home is null or p_away is null or p_home < 0 or p_away < 0 then raise exception 'Placar inválido'; end if;

  update games set status = 'finished', home_score = p_home, away_score = p_away where id = p_game_id;

  select id into v_market from markets where game_id = p_game_id and is_main and status = 'open' limit 1;
  if v_market is not null then
    select id into v_opt from options where market_id = v_market
      and position = case when p_home > p_away then 0 when p_home = p_away then 1 else 2 end;
    if v_opt is not null then perform _settle_market(v_market, v_opt); end if;
  end if;
end $$;

-- Cancela o jogo e devolve todas as apostas pendentes
create or replace function public.cancel_game(p_game_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_game public.games; v_market uuid;
begin
  v_game := _assert_creator(p_game_id);
  if v_game.status in ('finished','cancelled') then raise exception 'Este jogo já foi encerrado'; end if;
  for v_market in select id from markets where game_id = p_game_id and status = 'open' loop
    perform _void_market(v_market);
  end loop;
  update games set status = 'cancelled' where id = p_game_id;
end $$;

-- Bônus diário de MJ$ 100 (pra ninguém ficar quebrado pra sempre)
create or replace function public.claim_daily_bonus()
returns numeric language plpgsql security definer set search_path = public as $$
declare v_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  select * into v_profile from profiles where id = auth.uid() for update;
  if v_profile.last_bonus_at is not null and v_profile.last_bonus_at > now() - interval '24 hours' then
    raise exception 'Bônus disponível novamente em %',
      to_char((v_profile.last_bonus_at + interval '24 hours') - now(), 'HH24"h"MI"min"');
  end if;
  update profiles set balance = balance + 100, last_bonus_at = now() where id = auth.uid()
  returning balance into v_profile.balance;
  return v_profile.balance;
end $$;

-- ---------- Permissões das funções ----------
revoke execute on function public._assert_creator(uuid) from public, anon, authenticated;
revoke execute on function public._insert_market(uuid, jsonb, int, boolean) from public, anon, authenticated;
revoke execute on function public._settle_market(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._void_market(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.create_game(text, text, text, text, timestamptz, jsonb, jsonb) from public, anon;
revoke execute on function public.add_market(uuid, jsonb) from public, anon;
revoke execute on function public.update_odd(uuid, numeric) from public, anon;
revoke execute on function public.place_bet(uuid, numeric) from public, anon;
revoke execute on function public.settle_market(uuid, uuid) from public, anon;
revoke execute on function public.void_market(uuid) from public, anon;
revoke execute on function public.set_betting_open(uuid, boolean) from public, anon;
revoke execute on function public.finish_game(uuid, int, int) from public, anon;
revoke execute on function public.cancel_game(uuid) from public, anon;
revoke execute on function public.claim_daily_bonus() from public, anon;

grant execute on function public.create_game(text, text, text, text, timestamptz, jsonb, jsonb) to authenticated;
grant execute on function public.add_market(uuid, jsonb) to authenticated;
grant execute on function public.update_odd(uuid, numeric) to authenticated;
grant execute on function public.place_bet(uuid, numeric) to authenticated;
grant execute on function public.settle_market(uuid, uuid) to authenticated;
grant execute on function public.void_market(uuid) to authenticated;
grant execute on function public.set_betting_open(uuid, boolean) to authenticated;
grant execute on function public.finish_game(uuid, int, int) to authenticated;
grant execute on function public.cancel_game(uuid) to authenticated;
grant execute on function public.claim_daily_bonus() to authenticated;

-- ---------- Realtime (odds, apostas, comentários e saldo ao vivo) ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','games','markets','options','bets','comments'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
