'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ChatMessage = {
  id: string
  created_at: string
  user_name: string
  message: string
}

function getTodayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatDrawer({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load today's messages
  useEffect(() => {
    supabase
      .from('chat_messages')
      .select('*')
      .gte('created_at', getTodayStart())
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[])
      })
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as ChatMessage
          setMessages((prev) => [...prev, msg])
          if (!open) setUnread((n) => n + 1)
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [open])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setUnread(0)
    }
  }, [messages, open])

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    await supabase.from('chat_messages').insert({
      user_name: userName,
      message: text,
    })
    setInput('')
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    <>
      {/* Floating chat button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_8px_24px_rgba(15,23,42,0.25)] transition hover:bg-slate-700"
        aria-label="Open chat"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {/* Backdrop */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Drawer */}
      <div
        className={`fixed bottom-0 right-0 z-50 flex h-[560px] w-full max-w-sm flex-col rounded-tl-2xl rounded-tr-2xl bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.12)] transition-transform duration-300 sm:bottom-6 sm:right-6 sm:rounded-2xl ${open ? 'translate-y-0' : 'translate-y-[120%]'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b bg-slate-900 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Team Chat</p>
            <p className="text-xs text-slate-400">Today only · messages reset daily</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 ? (
            <p className="mt-10 text-center text-sm text-slate-400">No messages yet today. Say hi!</p>
          ) : null}
          {messages.map((msg) => {
            const isMe = msg.user_name === userName
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe ? (
                  <p className="mb-0.5 text-[10px] font-medium text-slate-400">{msg.user_name}</p>
                ) : null}
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isMe ? 'rounded-tr-sm bg-slate-900 text-white' : 'rounded-tl-sm bg-slate-100 text-slate-800'}`}>
                  {msg.message}
                </div>
                <p className="mt-0.5 text-[10px] text-slate-300">{formatTime(msg.created_at)}</p>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t px-3 py-3">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || sending}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </>
  )
}
