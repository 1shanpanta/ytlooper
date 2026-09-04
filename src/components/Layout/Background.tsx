import React from 'react';

interface BackgroundProps {
  className?: string;
}

export const Background: React.FC<BackgroundProps> = ({ className = "" }) => {
  return (
    <div className={`absolute inset-0 -z-10 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0b] to-black"></div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.03), transparent 40%)' }}
      ></div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{ background: 'radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,0.06), transparent 60%)' }}
      ></div>
    </div>
  );
};