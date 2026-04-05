import React from 'react';
import { Link2 } from 'lucide-react';
import { UrlInputProps } from '../../types';

export const UrlInput: React.FC<UrlInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  disabled = false,
  className = "",
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor="youtube-url" className="text-sm font-medium text-white/70 flex items-center gap-2 mb-1">
        <Link2 className="h-4 w-4 text-white/60" />
        YouTube URL
      </label>
      <div className="w-full rounded-xl bg-white/5 ring-1 ring-white/10 shadow-[inset_0_2px_10px_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.35)] focus-within:ring-white/20 transition">
        <input
          id="youtube-url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent outline-none px-4 py-3 text-sm sm:text-base placeholder:text-white/35 text-white/90 focus-visible:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};