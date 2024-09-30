import React from 'react';

interface IconButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
}

const IconButton: React.FC<IconButtonProps> = ({ onClick, icon }) => {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-600 backdrop-blur-sm text-white hover:bg-gray-700"
    >
      {icon}
    </button>
  );
};

export default IconButton;