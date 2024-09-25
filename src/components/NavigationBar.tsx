export default function NavigationBar({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
    const buttonClasses = (page: string) => 
        `flex w-[80px] h-[32px] transform p-[6px_13px] justify-center items-center gap-[32px] rounded-[4px] backdrop-blur-[0.53px] ${activePage === page ? 'bg-white' : ''}`; 
    
    const textClasses = (page: string) => 
        `${activePage === page ? 'text-black' : 'text-white'} text-center leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[14.87px] font-[493] leading-normal tracking-[-0.3px]`;

    return (
      <div className="inline-flex justify-center items-center p-1 gap-4 rounded-[6.67px] shadow-md backdrop-blur-[33px] bg-[#232323]"> {/* Added w-auto */}
        <div className="inline-flex justify-center items-center gap-3">
          <div className={buttonClasses('timer')}>
              <button onClick={() => setActivePage('timer')} className={textClasses('timer')}>Time</button>
          </div>
          <div className={buttonClasses('chart')}>
              <button onClick={() => setActivePage('chart')} className={textClasses('chart')}>Charts</button>
          </div>
          <div className={buttonClasses('settings')}>
              <button onClick={() => setActivePage('settings')} className={textClasses('settings')}>Settings</button>
          </div>
        </div>
      </div>
    );
}