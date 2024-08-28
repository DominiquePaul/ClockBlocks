import { useState } from "react";

function Box({ title, time, isActive, onClick }: { title: string; time: string; isActive: boolean; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      onClick={onClick} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex flex-col justify-center items-center w-full h-full max-w-[min(100%,120px)] max-h-[120px] aspect-square rounded-[30px] transition-transform duration-200 ${isHovered ? 'scale-105' : ''} ${isActive ? 'ring-2 ring-blue-500' : ''}`}
    >
      <div className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-[#FFFFFF50] to-[#5FBCFF50]" />
      <div className={`relative flex flex-col justify-center items-center w-full h-full rounded-[calc(30px-1px)] bg-gradient-to-b from-white to-[#FF9874] ${isActive ? 'opacity-80' : ''}`}>
        <h2>{title}</h2>
        <p>{time}</p>
      </div>
    </div>
  );
}

export default Box;