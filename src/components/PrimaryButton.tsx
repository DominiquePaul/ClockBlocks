import React from 'react';

interface PrimaryButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isClickable: boolean;
}

export default function PrimaryButton({ isActive, onClick, children, icon, isClickable=true }: PrimaryButtonProps) {
  
  const buttonClasses = `flex items-center justify-center min-w-[80px] h-[32px] px-3 py-1.5 rounded-[4px] backdrop-blur-[0.5px] ${
    isActive ? 'bg-white' :''}  ${isClickable ? 'cursor-pointer' : 'bg-gray-400 cursor-not-allowed opacity-50'
  }`;
  
  const textClasses = `${
    isActive ? 'text-black' : 'text-white'
  } text-center leading-trim text-edge-cap text-[14px] leading-normal tracking-[-0.3px]`;


  return (
    <button 
      onClick={isClickable ? onClick : undefined} 
      disabled={!isClickable}
      className={buttonClasses}
    >
      {icon && <span className="mr-2">{icon}</span>}
      <span className={textClasses}>{children}</span>
    </button>
  );
}