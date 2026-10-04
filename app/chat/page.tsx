'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { MessageBubble, type ChatMessage } from '@/components/chat/MessageBubble'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import type { Doctor } from '@/components/chat/DoctorCard'

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init-1',
  role: 'assistant',
  content: `Hello! 👋 I'm **MediBot**, your AI assistant for HealthPlus Clinic.\n\nI can help you find the right specialist, check doctor schedules across morning & evening shifts, and book your appointment in seconds.\n\nHow can I help you today? You can describe your health issue or ask for a doctor directly!`,
  timestamp: 'Just now',
}

const QUICK_PROMPTS = [
  '❤️ I have chest pain and need a cardiologist',
  '🌿 Skin rash & itching, need dermatologist',
  '🦴 Joint pain and swelling in knee',
  '🩺 Mild fever & headache for 2 days',
  '📅 Show all available doctors',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionKey, setSessionKey] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize unique session key from localStorage
  useEffect(() => {
    let key = localStorage.getItem('medi_chat_session_key')
    if (!key) {
      key = 'session_' + Math.random().toString(36).substring(2, 12)
      localStorage.setItem('medi_chat_session_key', key)
    }
    setSessionKey(key)
  }, [])

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Send message to /api/chat
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim()
    if (!text || isLoading) return

    const now = new Date()
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: timeFormatted,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          session_key: sessionKey,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get a response from AI.')
      }

      const botMessage: ChatMessage = {
        id: 'msg-bot-' + Date.now(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionData: data.actionData,
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (err: any) {
      console.error('Chat error:', err)
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: `Sorry, I encountered an issue: ${err.message || 'Network error'}. Please try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleSelectDoctor = (doctor: Doctor) => {
    handleSendMessage(`I'd like to book an appointment with ${doctor.name} (${doctor.specialty}). What slots are available?`)
  }

  const handleSelectSlot = (slot: string, date: string, doctorName: string) => {
    handleSendMessage(`Please book my appointment with ${doctorName} on ${date} at ${slot}.`)
  }

  const handleResetChat = () => {
    if (confirm('Start a fresh new conversation?')) {
      const newKey = 'session_' + Math.random().toString(36).substring(2, 12)
      localStorage.setItem('medi_chat_session_key', newKey)
      setSessionKey(newKey)
      setMessages([INITIAL_MESSAGE])
    }
  }

  return (
    <div className="min-h-screen bg-[#fafcfb] font-sans text-zinc-900 relative selection:bg-emerald-100 selection:text-emerald-900">
      {/* ─── Top Navbar (Fixed, White & Green) ─────────────── */}
      <header className="fixed top-0 left-0 right-0 h-16 px-4 sm:px-8 bg-white/95 backdrop-blur-md border-b border-emerald-100 flex items-center justify-between z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-base shadow-sm group-hover:scale-105 transition-transform">
              🩺
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm sm:text-base tracking-tight text-zinc-900">
                  HealthPlus <span className="text-emerald-600 font-serif italic">MediBot</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-light hidden sm:block">
                AI Doctor Appointment Booking System
              </p>
            </div>
          </Link>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            title="Reset conversation"
            className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-emerald-50 rounded-xl transition-colors border border-transparent hover:border-emerald-200/60 cursor-pointer"
          >
            🔄 Reset
          </button>

          <Link
            href="/admin"
            className="px-3.5 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-xs flex items-center gap-1"
          >
            <span>Admin</span>
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* ─── Main Chat Messages Area (Browser Scrollable) ─── */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 pt-20 pb-44">
        <div className="space-y-1">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onSelectDoctor={handleSelectDoctor}
              onSelectSlot={handleSelectSlot}
              onQuickReply={handleSendMessage}
            />
          ))}

          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* ─── Input & Quick Prompts Footer (Fixed at Bottom) ─ */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-emerald-100 p-3 sm:p-4 z-30 shadow-lg shadow-emerald-900/5">
        <div className="max-w-4xl mx-auto space-y-2.5">
          {/* Quick Prompts Bar */}
          {messages.length <= 2 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider flex-shrink-0">
                Suggested:
              </span>
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="px-3 py-1 text-xs rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/70 transition-colors whitespace-nowrap cursor-pointer flex-shrink-0 font-light"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe your health issue or request a doctor (e.g. 'I need a cardiologist tomorrow morning')..."
                disabled={isLoading}
                className="w-full pl-4 pr-10 py-3.5 bg-[#f8faf9] border border-emerald-200/70 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400 text-zinc-900 shadow-2xs"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-2xl shadow-sm shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
            >
              <span>Send</span>
              <span>↑</span>
            </button>
          </form>

          {/* Medical Notice */}
          <p className="text-[10px] text-center text-zinc-400 font-light">
            🚨 <span className="font-medium text-zinc-500">Notice:</span> MediBot provides appointment scheduling assistance and does not provide medical diagnoses. For emergencies, please call emergency services immediately.
          </p>
        </div>
      </footer>
    </div>
  )
}
