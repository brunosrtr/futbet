# ⚽ FutBet

Casa de apostas **fictícia** de futsal entre amigos. Moeda: FutCoins (FC), sem dinheiro real.

- Qualquer um cria um jogo, define as odds e compartilha o link
- Mercado principal (Casa / Empate / Fora) + opcionais (expulsão, quem marca, total de gols…)
- Todo mundo começa com FC 1.000, com bônus diário de FC 100
- O criador define os resultados e os pagamentos (stake × odd) caem na hora
- Comentários, feed de apostas e saldo ao vivo (Supabase Realtime), além de ranking
- Link do jogo gera preview com times e odds no WhatsApp (Open Graph dinâmico)

**Stack:** Next.js (App Router) + Tailwind (Vercel) · Supabase (Auth + Postgres + Realtime).
Toda a lógica de saldo roda em funções SQL no banco, então ninguém edita saldo pelo navegador.

## Deploy (~5 min)

1. **Supabase**: crie um projeto em https://supabase.com/dashboard
   - **SQL Editor** → cole `supabase/schema.sql` → Run
   - **Authentication → Sign In / Providers → Email**: desative *Confirm email* (assim os amigos entram direto)
   - **Project Settings → API**: copie a *Project URL* e a *anon public key*
2. **Vercel**:
   ```bash
   vercel
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   vercel --prod
   ```
   (ou importe o repositório em vercel.com/new e adicione as 2 variáveis.)

## Local

```bash
cp .env.example .env   # preencha com as chaves
npm install
npm run dev
```
