'use client'

import React from 'react'
import type { AvailabilityResult } from '@/lib/services/appointmentService'

interface SlotPickerProps {
  availability: AvailabilityResult
  onSelectSlot?: (time: string, date: string, doctorName: string) => void
}

export function SlotPicker({ availability, onSelectSlot }: SlotPickerProps) {
  const { doctor_name, date, shifts = [], available_slots = [] } = availability

  if (available_slots.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 my-2 text-xs text-amber-800">
        <p className="font-medium">No available slots for {doctor_name} on {date}.</p>
        <p className="mt-1 text-amber-700">
          Please ask MediBot for another date (e.g. tomorrow or next Monday).
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-emerald-100/90 rounded-2xl p-4 shadow-xs my-2">
      <div className="flex items-center justify-between pb-3 border-b border-emerald-50">
        <div>
          <h4 className="text-xs font-semibold text-zinc-900">
            Available Slots: {doctor_name}
          </h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            📅 Date: <span className="font-medium text-emerald-600">{date}</span>
          </p>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
          {available_slots.length} open slots
        </span>
      </div>

      <div className="space-y-3.5 mt-3.5">
        {shifts.map((shift) => (
          <div key={shift.shift_name} className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-700">
              <span>{shift.shift_name.toLowerCase().includes('morning') ? '🌅' : '🌆'}</span>
              <span>{shift.shift_name} Shift</span>
              <span className="text-[10px] text-zinc-400 font-normal">
                ({shift.start_time} - {shift.end_time})
              </span>
            </div>

            {shift.slots.length === 0 ? (
              <p className="text-[11px] text-zinc-400 italic pl-1">No slots left in this shift</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {shift.slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => onSelectSlot && onSelectSlot(slot, date, doctor_name)}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200/70 transition-all cursor-pointer active:scale-95 shadow-2xs"
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
