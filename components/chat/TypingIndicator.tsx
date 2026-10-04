'use client'

import React from 'react'

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 my-3">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center text-sm shadow-xs flex-shrink-0 mt-0.5">
        🩺
      </div>

      <div className="bg-white border border-emerald-100 rounded-3xl rounded-tl-xs px-4 py-3 shadow-xs max-w-sm">
        <div className="flex items-center gap-1.5 h-5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
          <span className="ml-2 text-xs font-medium text-emerald-800">
            MediBot is checking schedules...
          </span>
        </div>
      </div>
    </div>
  )
}
