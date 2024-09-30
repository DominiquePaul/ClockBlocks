import React from 'react';

interface RoundedBoxProps {
  children: React.ReactNode;
  className?: string;
  roundedCorners?: 'top' | 'bottom' | 'both';
}

export default function RoundedBox({ children, className = '', roundedCorners = 'both' }: RoundedBoxProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {(roundedCorners === 'bottom' || roundedCorners === 'both') && (
        <>
          <div className="absolute -left-[20px] bottom-0 w-5 h-5 rounded-br-2xl bg-black shadow-[4px_6px_0_0_#232323]"></div>
          <div className="absolute -right-[20px] bottom-0 w-5 h-5 rounded-bl-2xl bg-black shadow-[-4px_6px_0_0_#232323]"></div>
        </>
      )}
      {(roundedCorners === 'top' || roundedCorners === 'both') && (
        <>
          <div className="absolute -left-[20px] top-0 w-5 h-5 rounded-tr-2xl bg-black shadow-[4px_-6px_0_0_#232323]"></div>
          <div className="absolute -right-[20px] top-0 w-5 h-5 rounded-tl-2xl bg-black shadow-[-4px_-6px_0_0_#232323]"></div>
        </>
      )}
    </div>
  );
}