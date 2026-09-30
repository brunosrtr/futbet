-- =====================================================================
-- MigasBet — Cassino (roleta, caça-níquel, mines e foguetinho)
-- Rode DEPOIS do schema.sql (SQL Editor → cole tudo → Run). Pode rodar
-- de novo sem problema. Todo sorteio acontece aqui no banco, com
-- aleatoriedade criptográfica — o navegador só recebe o resultado.
-- =====================================================================

create table if not exists public.casino_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null check (game in ('roulette','slots','mines','crash')),
  stake numeric(12,2) not null check (stake > 0),
  status text not null default 'active' check (status in ('active','won','lost')),
  payout numeric(12,2) not null default 0,
  multiplier numeric(10,2),
  state jsonb not null default '{}'::jsonb,   -- público
  secret jsonb not null default '{}'::jsonb,  -- posição das minas / ponto de explosão (nunca exposto)
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists casino_rounds_user_idx on public.casino_rounds(user_id, game, status);
create index if not exists casino_rounds_created_idx on public.casino_rounds(created_at desc);

alter table public.casino_rounds enable row level security;
drop policy if exists "read casino rounds" on public.casino_rounds;
create policy "read casino rounds" on public.casino_rounds for select using (true);

-- A coluna "secret" não pode ser lida por ninguém de fora
revoke all on public.casino_rounds from anon, authenticated;
grant select (id, user_id, game, stake, status, payout, multiplier, state, created_at, finished_at)
  on public.casino_rounds to anon, authenticated;

-- ---------- Helpers internos ----------

-- Número aleatório criptográfico em [0, 1)
create or replace function public._rand()
returns double precision language sql volatile set search_path = public, extensions as $$
  select ('x' || encode(gen_random_bytes(6), 'hex'))::bit(48)::bigint / 281474976710656.0
$$;

create or replace function public._debit(p_amount numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare v numeric;
begin
  if auth.uid() is null then raise exception 'Faça login para jogar'; end if;
  if p_amount is null or p_amount < 1 then raise exception 'Aposta mínima: MJ$ 1,00'; end if;
  select balance into v from profiles where id = auth.uid() for update;
  if v < p_amount then raise exception 'Saldo insuficiente'; end if;
  update profiles set balance = balance - p_amount where id = auth.uid() returning balance into v;
  return v;
end $$;

create or replace function public._credit(p_amount numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare v numeric;
begin
  update profiles set balance = balance + coalesce(p_amount, 0) where id = auth.uid() returning balance into v;
  return v;
end $$;

-- Multiplicador do Mines após k casas seguras (3% de margem da casa)
create or replace function public._mines_mult(p_mines int, p_k int)
returns numeric language plpgsql immutable as $$
declare v numeric := 0.97; i int;
begin
  if p_k <= 0 then return 1; end if;
  for i in 0..p_k - 1 loop
    v := v * (25 - i)::numeric / (25 - p_mines - i);
  end loop;
  return round(floor(v * 100) / 100, 2);
end $$;

-- Multiplicador do foguetinho: cresce e^(0.1·t) (2x em ~7s, 10x em ~23s)
create or replace function public._crash_mult(p_started timestamptz)
returns numeric language sql volatile as $$
  select round(floor(100 * exp(least(0.1 * extract(epoch from clock_timestamp() - p_started), 7))) / 100, 2)
$$;

-- ---------- Roleta (europeia, 0–36) ----------
-- p_bets: [{ "type": "number|red|black|even|odd|low|high|dozen|column", "value": n, "amount": x }]
create or replace function public.play_roulette(p_bets jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  b jsonb; v_type text; v_val int; v_amt numeric; v_total numeric := 0; v_payout numeric := 0;
  v_result int; v_red boolean; v_win boolean; v_balance numeric;
  v_reds int[] := array[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
begin
  if p_bets is null or jsonb_typeof(p_bets) <> 'array' or jsonb_array_length(p_bets) = 0 then
    raise exception 'Coloque pelo menos uma ficha';
  end if;
  if jsonb_array_length(p_bets) > 60 then raise exception 'Fichas demais'; end if;

  for b in select * from jsonb_array_elements(p_bets) loop
    v_type := b->>'type'; v_val := (b->>'value')::int; v_amt := round((b->>'amount')::numeric, 2);
    if v_amt is null or v_amt < 1 then raise exception 'Aposta mínima: MJ$ 1,00 por ficha'; end if;
    if v_type not in ('number','red','black','even','odd','low','high','dozen','column') then
      raise exception 'Aposta inválida';
    end if;
    if v_type = 'number' and (v_val is null or v_val < 0 or v_val > 36) then raise exception 'Número inválido'; end if;
    if v_type in ('dozen','column') and (v_val is null or v_val < 1 or v_val > 3) then raise exception 'Aposta inválida'; end if;
    v_total := v_total + v_amt;
  end loop;

  perform _debit(v_total);
  v_result := floor(_rand() * 37)::int;
  v_red := v_result = any(v_reds);

  for b in select * from jsonb_array_elements(p_bets) loop
    v_type := b->>'type'; v_val := (b->>'value')::int; v_amt := round((b->>'amount')::numeric, 2);
    v_win := case v_type
      when 'number' then v_result = v_val
      when 'red'    then v_red
      when 'black'  then v_result > 0 and not v_red
      when 'even'   then v_result > 0 and v_result % 2 = 0
      when 'odd'    then v_result % 2 = 1
      when 'low'    then v_result between 1 and 18
      when 'high'   then v_result between 19 and 36
      when 'dozen'  then v_result > 0 and (v_result - 1) / 12 + 1 = v_val
      when 'column' then v_result > 0 and (v_result - 1) % 3 + 1 = v_val
      else false end;
    if v_win then
      v_payout := v_payout + v_amt * case v_type when 'number' then 36 when 'dozen' then 3 when 'column' then 3 else 2 end;
    end if;
  end loop;

  v_balance := _credit(v_payout);
  insert into casino_rounds (user_id, game, stake, status, payout, multiplier, state, finished_at)
  values (auth.uid(), 'roulette', v_total, case when v_payout > 0 then 'won' else 'lost' end, v_payout,
          round(v_payout / v_total, 2), jsonb_build_object('result', v_result, 'bets', p_bets), now());

  return jsonb_build_object('result', v_result, 'stake', v_total, 'payout', v_payout, 'balance', v_balance);
end $$;

-- ---------- Caça-níquel (3 rolos, RTP ≈ 95%) ----------
-- Símbolos (índice 0–5): 🍒 🍋 🍇 🔔 💎 7️⃣
create or replace function public.play_slots(p_stake numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_stake numeric := round(p_stake, 2);
  v_weights int[] := array[32, 26, 20, 12, 7, 3];
  v_three numeric[] := array[6, 9, 15, 30, 80, 500];
  v_pair numeric[] := array[0.5, 0.5, 1, 1.5, 3, 5];
  v_reels int[] := '{}'; r double precision; acc int; i int; j int;
  v_mult numeric := 0; v_payout numeric; v_balance numeric;
begin
  perform _debit(v_stake);
  for i in 1..3 loop
    r := _rand() * 100; acc := 0;
    for j in 1..6 loop
      acc := acc + v_weights[j];
      if r < acc then v_reels := v_reels || j; exit; end if;
    end loop;
  end loop;

  if v_reels[1] = v_reels[2] and v_reels[2] = v_reels[3] then v_mult := v_three[v_reels[1]];
  elsif v_reels[1] = v_reels[2] or v_reels[1] = v_reels[3] then v_mult := v_pair[v_reels[1]];
  elsif v_reels[2] = v_reels[3] then v_mult := v_pair[v_reels[2]];
  end if;

  v_payout := round(v_stake * v_mult, 2);
  v_balance := _credit(v_payout);
  insert into casino_rounds (user_id, game, stake, status, payout, multiplier, state, finished_at)
  values (auth.uid(), 'slots', v_stake, case when v_payout > 0 then 'won' else 'lost' end, v_payout, v_mult,
          jsonb_build_object('reels', to_jsonb(array[v_reels[1] - 1, v_reels[2] - 1, v_reels[3] - 1])), now());

  return jsonb_build_object('reels', to_jsonb(array[v_reels[1] - 1, v_reels[2] - 1, v_reels[3] - 1]),
                            'multiplier', v_mult, 'payout', v_payout, 'balance', v_balance);
end $$;

-- ---------- Mines (tabuleiro 5x5) ----------
create or replace function public.mines_start(p_stake numeric, p_mines int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_stake numeric := round(p_stake, 2); v_pos int[]; v_id uuid; v_balance numeric;
begin
  if p_mines is null or p_mines < 1 or p_mines > 24 then raise exception 'Escolha de 1 a 24 minas'; end if;
  if exists (select 1 from casino_rounds where user_id = auth.uid() and game = 'mines' and status = 'active') then
    raise exception 'Você já tem uma partida de Mines em andamento';
  end if;
  v_balance := _debit(v_stake);
  select array_agg(c) into v_pos from (select c from generate_series(0, 24) c order by _rand() limit p_mines) s;
  insert into casino_rounds (user_id, game, stake, multiplier, state, secret)
  values (auth.uid(), 'mines', v_stake, 1,
          jsonb_build_object('mines', p_mines, 'revealed', '[]'::jsonb),
          jsonb_build_object('positions', to_jsonb(v_pos)))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'status', 'active', 'stake', v_stake, 'mines', p_mines,
                            'revealed', '[]'::jsonb, 'multiplier', 1,
                            'next_multiplier', _mines_mult(p_mines, 1), 'balance', v_balance);
end $$;

create or replace function public.mines_cashout(p_round uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.casino_rounds; v_m int; v_k int; v_mult numeric; v_payout numeric; v_balance numeric;
begin
  select * into r from casino_rounds where id = p_round and user_id = auth.uid() and game = 'mines' for update;
  if not found then raise exception 'Partida não encontrada'; end if;
  if r.status <> 'active' then raise exception 'Partida já encerrada'; end if;
  v_m := (r.state->>'mines')::int;
  v_k := jsonb_array_length(r.state->'revealed');
  if v_k = 0 then raise exception 'Revele pelo menos uma casa antes de retirar'; end if;
  v_mult := _mines_mult(v_m, v_k);
  v_payout := round(r.stake * v_mult, 2);
  update casino_rounds set status = 'won', payout = v_payout, multiplier = v_mult, finished_at = now() where id = r.id;
  v_balance := _credit(v_payout);
  return jsonb_build_object('id', r.id, 'status', 'won', 'stake', r.stake, 'mines', v_m, 'revealed', r.state->'revealed',
                            'positions', r.secret->'positions', 'multiplier', v_mult, 'payout', v_payout, 'balance', v_balance);
end $$;

create or replace function public.mines_reveal(p_round uuid, p_cell int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.casino_rounds; v_rev jsonb; v_m int; v_k int; v_mult numeric;
begin
  select * into r from casino_rounds where id = p_round and user_id = auth.uid() and game = 'mines' for update;
  if not found then raise exception 'Partida não encontrada'; end if;
  if r.status <> 'active' then raise exception 'Partida já encerrada'; end if;
  if p_cell is null or p_cell < 0 or p_cell > 24 then raise exception 'Casa inválida'; end if;
  v_rev := r.state->'revealed';
  v_m := (r.state->>'mines')::int;
  if v_rev @> jsonb_build_array(p_cell) then raise exception 'Casa já revelada'; end if;

  if (r.secret->'positions') @> jsonb_build_array(p_cell) then
    update casino_rounds set status = 'lost', payout = 0, multiplier = 0, finished_at = now(),
      state = state || jsonb_build_object('hit', p_cell) where id = r.id;
    return jsonb_build_object('id', r.id, 'status', 'lost', 'stake', r.stake, 'mines', v_m, 'revealed', v_rev,
                              'hit', p_cell, 'positions', r.secret->'positions', 'multiplier', 0, 'payout', 0);
  end if;

  v_rev := v_rev || jsonb_build_array(p_cell);
  v_k := jsonb_array_length(v_rev);
  v_mult := _mines_mult(v_m, v_k);
  update casino_rounds set state = jsonb_set(state, '{revealed}', v_rev), multiplier = v_mult where id = r.id;

  if v_k = 25 - v_m then return mines_cashout(p_round); end if;  -- achou todas as seguras

  return jsonb_build_object('id', r.id, 'status', 'active', 'stake', r.stake, 'mines', v_m, 'revealed', v_rev,
                            'multiplier', v_mult, 'next_multiplier', _mines_mult(v_m, v_k + 1));
end $$;

create or replace function public.mines_current()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.casino_rounds; v_m int; v_k int;
begin
  select * into r from casino_rounds where user_id = auth.uid() and game = 'mines' and status = 'active'
  order by created_at desc limit 1;
  if not found then return null; end if;
  v_m := (r.state->>'mines')::int;
  v_k := jsonb_array_length(r.state->'revealed');
  return jsonb_build_object('id', r.id, 'status', 'active', 'stake', r.stake, 'mines', v_m, 'revealed', r.state->'revealed',
                            'multiplier', _mines_mult(v_m, v_k), 'next_multiplier', _mines_mult(v_m, v_k + 1));
end $$;

-- ---------- Foguetinho (crash) ----------
-- Ponto de explosão: P(chegar em x) = 0.97 / x  → 3% de margem da casa
create or replace function public.crash_start(p_stake numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_stake numeric := round(p_stake, 2); v_crash numeric; v_id uuid; v_balance numeric;
begin
  -- rodada abandonada (fechou a aba) conta como perdida
  update casino_rounds set status = 'lost', multiplier = 0, finished_at = now(),
    state = state || jsonb_build_object('crash', secret->'crash')
  where user_id = auth.uid() and game = 'crash' and status = 'active';

  v_balance := _debit(v_stake);
  v_crash := least(1000, greatest(1, floor(97 / (1 - _rand())) / 100));
  insert into casino_rounds (user_id, game, stake, state, secret)
  values (auth.uid(), 'crash', v_stake, jsonb_build_object('started_at', clock_timestamp()),
          jsonb_build_object('crash', v_crash))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'stake', v_stake, 'balance', v_balance);
end $$;

create or replace function public._crash_bust(r public.casino_rounds)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update casino_rounds set status = 'lost', multiplier = 0, finished_at = now(),
    state = state || jsonb_build_object('crash', r.secret->'crash')
  where id = r.id;
  return jsonb_build_object('status', 'lost', 'crash', (r.secret->>'crash')::numeric, 'payout', 0);
end $$;

create or replace function public.crash_poll(p_round uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.casino_rounds; v_m numeric;
begin
  select * into r from casino_rounds where id = p_round and user_id = auth.uid() and game = 'crash' for update;
  if not found then raise exception 'Rodada não encontrada'; end if;
  if r.status <> 'active' then
    return jsonb_build_object('status', r.status, 'crash', (r.secret->>'crash')::numeric,
                              'multiplier', r.multiplier, 'payout', r.payout);
  end if;
  v_m := _crash_mult((r.state->>'started_at')::timestamptz);
  if v_m >= (r.secret->>'crash')::numeric then return _crash_bust(r); end if;
  return jsonb_build_object('status', 'active', 'multiplier', v_m);
end $$;

create or replace function public.crash_cashout(p_round uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.casino_rounds; v_m numeric; v_payout numeric; v_balance numeric;
begin
  select * into r from casino_rounds where id = p_round and user_id = auth.uid() and game = 'crash' for update;
  if not found then raise exception 'Rodada não encontrada'; end if;
  if r.status <> 'active' then
    return jsonb_build_object('status', r.status, 'crash', (r.secret->>'crash')::numeric,
                              'multiplier', r.multiplier, 'payout', r.payout);
  end if;
  v_m := _crash_mult((r.state->>'started_at')::timestamptz);
  if v_m >= (r.secret->>'crash')::numeric then return _crash_bust(r); end if;

  v_payout := round(r.stake * v_m, 2);
  update casino_rounds set status = 'won', payout = v_payout, multiplier = v_m, finished_at = now(),
    state = state || jsonb_build_object('crash', r.secret->'crash')
  where id = r.id;
  v_balance := _credit(v_payout);
  return jsonb_build_object('status', 'won', 'multiplier', v_m, 'payout', v_payout,
                            'crash', (r.secret->>'crash')::numeric, 'balance', v_balance);
end $$;

-- ---------- Permissões ----------
revoke execute on function public._rand() from public, anon, authenticated;
revoke execute on function public._debit(numeric) from public, anon, authenticated;
revoke execute on function public._credit(numeric) from public, anon, authenticated;
revoke execute on function public._mines_mult(int, int) from public, anon, authenticated;
revoke execute on function public._crash_mult(timestamptz) from public, anon, authenticated;
revoke execute on function public._crash_bust(public.casino_rounds) from public, anon, authenticated;

revoke execute on function public.play_roulette(jsonb) from public, anon;
revoke execute on function public.play_slots(numeric) from public, anon;
revoke execute on function public.mines_start(numeric, int) from public, anon;
revoke execute on function public.mines_reveal(uuid, int) from public, anon;
revoke execute on function public.mines_cashout(uuid) from public, anon;
revoke execute on function public.mines_current() from public, anon;
revoke execute on function public.crash_start(numeric) from public, anon;
revoke execute on function public.crash_poll(uuid) from public, anon;
revoke execute on function public.crash_cashout(uuid) from public, anon;

grant execute on function public.play_roulette(jsonb) to authenticated;
grant execute on function public.play_slots(numeric) to authenticated;
grant execute on function public.mines_start(numeric, int) to authenticated;
grant execute on function public.mines_reveal(uuid, int) to authenticated;
grant execute on function public.mines_cashout(uuid) to authenticated;
grant execute on function public.mines_current() to authenticated;
grant execute on function public.crash_start(numeric) to authenticated;
grant execute on function public.crash_poll(uuid) to authenticated;
grant execute on function public.crash_cashout(uuid) to authenticated;
