import React from 'react';

interface PrimaryButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export default function PrimaryButton({ isActive, onClick, children, icon }: PrimaryButtonProps) {
  const buttonClasses = `flex items-center justify-center min-w-[80px] h-[32px] px-3 py-1.5 rounded-[4px] backdrop-blur-[0.5px] ${isActive ? 'bg-white' : ''}`;
  
  const textClasses = `${isActive ? 'text-black' : 'text-white'} text-center leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[14.87px] font-[493] leading-normal tracking-[-0.3px]`;

  return (
    <button onClick={onClick} className={buttonClasses}>
      {icon && <span className="mr-2">{icon}</span>}
      <span className={textClasses}>{children}</span>
    </button>
  );
}