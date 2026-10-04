'use client'

import React from 'react'

export interface Doctor {
  id: string
  name: string
  specialty: string
  qualification?: string
  experience_years?: number
  bio?: string
  consultation_fee: number
}

interface DoctorCardProps {
  doctor: Doctor
  onSelect?: (doctor: Doctor) => void
}

export function DoctorCard({ doctor, onSelect }: DoctorCardProps) {
  return (
    <div className="bg-white border border-emerald-100/90 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 font-semibold flex items-center justify-center text-xs flex-shrink-0 border border-emerald-200/60">
              {doctor.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="font-medium text-zinc-900 text-sm leading-tight">
                {doctor.name}
              </h4>
              <p className="text-xs text-zinc-400 font-light mt-0.5">
                {doctor.qualification || doctor.specialty}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            {doctor.specialty}
          </span>
        </div>

        {doctor.bio && (
          <p className="text-xs text-zinc-500 font-light mt-2.5 line-clamp-2 leading-relaxed">
            {doctor.bio}
          </p>
        )}

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-emerald-50 text-xs">
          <div>
            <span className="text-zinc-400 text-[10px] block uppercase font-light">Exp</span>
            <span className="font-medium text-zinc-700">{doctor.experience_years || 0} yrs</span>
          </div>
          <div>
            <span className="text-zinc-400 text-[10px] block uppercase font-light">Fee</span>
            <span className="font-semibold text-emerald-700">₹{doctor.consultation_fee}</span>
          </div>
        </div>
      </div>

      {onSelect && (
        <button
          onClick={() => onSelect(doctor)}
          className="mt-3.5 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
        >
          Select {doctor.name.split(' ')[1] || doctor.name} →
        </button>
      )}
    </div>
  )
}
