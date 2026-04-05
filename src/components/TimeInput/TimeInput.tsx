import React from 'react';
import { Clock } from 'lucide-react';
import { TimeInputProps } from '../../types';

export const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder = "0 or 1m26s",
  label = "Time",
  disabled = false,
  className = "",
}) => {
  const inputId = `time-input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="text-sm font-medium text-white/70 flex items-center gap-2 mb-1">
        <Clock className="h-4 w-4 text-white/60" />
        {label}
      </label>
      <div className="rounded-xl bg-white/5 ring-1 ring-white/10 shadow-[inset_0_2px_10px_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.35)] focus-within:ring-white/20 transition">
        <input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          inputMode="text"
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent outline-none px-4 py-3 text-sm sm:text-base placeholder:text-sm placeholder:text-white/35 text-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};