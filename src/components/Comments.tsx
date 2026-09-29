'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { errMsg, teamColor, timeAgo } from '@/lib/format'
import type { Comment } from '@/lib/types'

export default function Comments({ gameId, creatorId }: { gameId: string; creatorId: string }) {
  const { profile } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('comments')
      .select('*, profile:profiles(username)')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(200)
    setComments((data as Comment[]) ?? [])
  }

  useEffect(() => {
    load()
    const ch = supabase
      .channel(`comments-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `game_id=eq.${gameId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [gameId])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content || !profile) return
    setSending(true)
    const { error } = await supabase.from('comments').insert({ game_id: gameId, user_id: profile.id, content })
    setSending(false)
    if (error) return toast.error(errMsg(error))
    setText('')
    load()
  }

  async function del(id: string) {
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) toast.error(errMsg(error))
    else setComments((c) => c.filter((x) => x.id !== id))
  }

  return (
    <section className="card">
      <h2 className="flex items-center gap-2 border-b border-line px-4 py-3 font-display text-lg font-bold uppercase tracking-wide">
        <MessageCircle size={18} className="text-brand" /> Comentários <span className="text-sm text-muted">({comments.length})</span>
      </h2>

      {profile ? (
        <form onSubmit={send} className="flex gap-2 border-b border-line p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder="Escreva um comentário…"
            className="input"
          />
          <button disabled={sending || !text.trim()} className="btn-primary px-3"><Send size={16} /></button>
        </form>
      ) : (
        <div className="border-b border-line p-3 text-sm text-muted">
          <Link href="/entrar" className="font-semibold text-brand hover:underline">Entre</Link> para comentar.
        </div>
      )}

      <ul className="scrollbar-thin max-h-[480px] divide-y divide-line overflow-y-auto">
        {comments.length === 0 && <li className="p-6 text-center text-sm text-muted">Nenhum comentário ainda.</li>}
        {comments.map((c) => {
          const name = c.profile?.username ?? '???'
          return (
            <li key={c.id} className="group flex gap-3 px-4 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-bg" style={{ background: teamColor(name) }}>
                {name[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-200">{name}</span>
                  {c.user_id === creatorId && <span className="rounded bg-gold/15 px-1.5 text-[10px] font-bold uppercase text-gold">Criador</span>}
                  <span className="text-muted">{timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-0.5 break-words text-sm text-slate-300">{c.content}</p>
              </div>
              {profile?.id === c.user_id && (
                <button onClick={() => del(c.id)} className="self-start text-slate-600 opacity-0 transition group-hover:opacity-100 hover:text-lose">
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
