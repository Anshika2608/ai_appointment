'use client'

import React from 'react'
import { DoctorCard, type Doctor } from './DoctorCard'
import { SlotPicker } from './SlotPicker'
import { ConfirmationCard, type AppointmentDetails } from './ConfirmationCard'
import type { AvailabilityResult } from '@/lib/services/appointmentService'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  actionData?: {
    type: 'doctors_list' | 'availability_slots' | 'appointment_booked'
    data: any
  }
}

interface MessageBubbleProps {
  message: ChatMessage
  onSelectDoctor?: (doctor: Doctor) => void
  onSelectSlot?: (time: string, date: string, doctorName: string) => void
  onQuickReply?: (reply: string) => void
}

/**
 * Parses inline formatting like **bold**, *italic*, and `code`
 * Removes raw asterisks and renders semantic HTML elements
 */
function parseInline(text: string, isUser: boolean): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const boldText = part.slice(2, -2)
      return (
        <strong
          key={index}
          className={`font-semibold ${isUser ? 'text-white' : 'text-zinc-900'}`}
        >
          {boldText}
        </strong>
      )
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
      const italicText = part.slice(1, -1)
      return (
        <em key={index} className="italic text-emerald-700">
          {italicText}
        </em>
      )
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeText = part.slice(1, -1)
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-xs font-mono border border-emerald-200/50"
        >
          {codeText}
        </code>
      )
    }

    const cleaned = part.replace(/\*\*/g, '')
    return cleaned
  })
}

/**
 * Renders full markdown text into clean paragraphs, bullet lists, and summary cards
 */
function FormattedContent({ text, isUser }: { text: string; isUser: boolean }) {
  const paragraphs = text.split(/\n\s*\n/)

  return (
    <div className="space-y-2.5">
      {paragraphs.map((para, pIdx) => {
        const lines = para.split('\n').map((l) => l.trim()).filter(Boolean)

        const isBulletList =
          lines.length > 0 &&
          lines.every((l) => l.startsWith('- ') || l.startsWith('* ') || /^\d+\.\s/.test(l))

        if (isBulletList) {
          return (
            <ul key={pIdx} className="space-y-1.5 my-1.5 pl-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '')
                return (
                  <li key={lIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                    <span className="text-emerald-500 font-bold text-sm leading-none mt-0.5 select-none">
                      •
                    </span>
                    <span className="flex-1 leading-relaxed">
                      {parseInline(cleanLine, isUser)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )
        }

        if (lines.length === 1 && lines[0].startsWith('#')) {
          const headerLevel = lines[0].match(/^#+/)?.[0].length || 1
          const headerText = lines[0].replace(/^#+\s*/, '')
          return (
            <h4
              key={pIdx}
              className={`font-semibold ${headerLevel <= 2 ? 'text-base text-emerald-950' : 'text-sm text-zinc-900'
                } mt-2`}
            >
              {parseInline(headerText, isUser)}
            </h4>
          )
        }

        return (
          <p key={pIdx} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {parseInline(line, isUser)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

export function MessageBubble({
  message,
  onSelectDoctor,
  onSelectSlot,
  onQuickReply,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const isAskingConfirmation =
    !isUser &&
    (message.content.toLowerCase().includes('would you like to confirm') ||
      message.content.toLowerCase().includes('please confirm') ||
      message.content.toLowerCase().includes('shall i confirm'))

  return (
    <div className={`flex w-full my-3.5 gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Bot Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center text-sm shadow-xs flex-shrink-0 mt-0.5">
          🩺
        </div>
      )}

      {/* Bubble Container */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-3xl px-5 py-3.5 text-sm leading-relaxed shadow-xs ${isUser
              ? 'bg-emerald-600 text-white rounded-tr-xs shadow-emerald-600/10'
              : 'bg-white text-zinc-800 border border-emerald-100 rounded-tl-xs shadow-xs'
            }`}
        >
          <FormattedContent text={message.content} isUser={isUser} />
        </div>

        {/* Quick Confirmation Action Buttons */}
        {isAskingConfirmation && onQuickReply && (
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={() => onQuickReply('Yes, please confirm this appointment')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>✓ Confirm Booking</span>
            </button>
            <button
              onClick={() => onQuickReply('I want to change the time or doctor')}
              className="px-3.5 py-2 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Change Details
            </button>
          </div>
        )}

        {/* Embedded Interactive Action Cards */}
        {message.actionData && (
          <div className="w-full mt-2">
            {message.actionData.type === 'doctors_list' && Array.isArray(message.actionData.data) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
                {message.actionData.data.map((doc: Doctor) => (
                  <DoctorCard key={doc.id} doctor={doc} onSelect={onSelectDoctor} />
                ))}
              </div>
            )}

            {message.actionData.type === 'availability_slots' && (
              <SlotPicker
                availability={message.actionData.data as AvailabilityResult}
                onSelectSlot={onSelectSlot}
              />
            )}

            {message.actionData.type === 'appointment_booked' && (
              <ConfirmationCard
                appointment={message.actionData.data as AppointmentDetails}
              />
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-zinc-400 mt-1 px-1 font-light">
          {message.timestamp}
        </span>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5 shadow-xs">
          👤
        </div>
      )}
    </div>
  )
}
