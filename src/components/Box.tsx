function Box({ name, seconds, isActive, onClick, color }: { name: string; seconds: string; isActive: boolean; onClick: () => void, color: string }) {

  return (  
    <div 
      onClick={onClick} 
      className="w-full min-w-[200px] min-h-[200px] aspect-square flex-shrink-0 relative select-none" // Added select-none to prevent text selection
    >
      
      <div className="w-full h-full flex-shrink-0 rounded-[14px] bg-black backdrop-blur-[40px] filter drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.05)) relative p-4 overflow-hidden">


      {isActive && (
        <div 
          className="w-[200px] h-[200px] flex-shrink-0 rounded-[200px] filter blur-[50px] absolute top-[65%] left-1/2 transform -translate-x-1/2 z-0"
          style={{ backgroundColor: color }}
        ></div>
      )}

      <div className={`flex w-full h-full flex-col justify-between items-center flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-30'} relative z-10`}>
          
        <div className="flex items-center gap-[26px]">
          
          <div className={`rounded-[3px] backdrop-blur-[0.45px] flex p-[3px_8px] items-center gap-[26px] ${isActive ? 'bg-[rgba(119,200,255,0.10)]' : 'bg-transparent'}`}>
            <div className="flex items-center gap-[4px]" style={{ visibility: isActive ? 'visible' : 'hidden' }}>
              <svg width="7" height="7" viewBox="0 0 4 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="1.9" cy="2.4" r="1.5" fill={color}/>
              </svg>
              <p className="text-white text-center leading-trim text-edge-cap text-[10px]  leading-normal">Active session</p>
            </div>
          </div>
        </div>

        <p className="text-white leading-trim text-edge-cap text-[44px]  leading-normal tracking-[-0.876px]">{seconds}</p>
        <h2 className="text-white text-center leading-trim text-edge-cap text-[20px]  leading-normal tracking-[-0.438px]">{name}</h2>
      </div>
      
      </div>
    </div>
  );
}

export default Box;