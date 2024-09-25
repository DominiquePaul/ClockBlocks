import Box from '../components/Box';
import { TimeBox, Session } from "../lib/types";


function TimerPage({ boxes, handleTimeBoxClick, formatTime, activeSession, resetAllTimers }: {   boxes: TimeBox[]; handleTimeBoxClick: (id: string) => void; formatTime: (seconds: number) => string; activeSession: Session; resetAllTimers: () => void }) {
  const isOverallTimerRunning = activeSession && activeSession.startDatetime
  return (
    <>
      <div className="flex flex-row justify-center items-center gap-[10px] p-2 w-fit mx-auto overflow-auto bg-[#232323] rounded-lg">
        {boxes.length <= 3 ? (
          <>
            {boxes.map(box => (
              <Box
                key={box.id}
                name={box.name}
                seconds={formatTime(box.seconds)}
                isActive={box.isActive}
                onClick={() => handleTimeBoxClick(box.id)}
              />
            ))}
          </>
        ) : (
          <div className="grid grid-cols-3 gap-[10px] p-2 w-fit mx-auto"> {/* Changed to 3 columns */}
            {boxes.slice(0, 6).map(box => (
              <Box
                key={box.id}
                name={box.name}
                seconds={formatTime(box.seconds)}
                isActive={box.isActive}
                onClick={() => handleTimeBoxClick(box.id)}
              />
            ))}
            {boxes.length % 3 === 2 && <div className="w-full h-10" />} {/* Empty box for uneven count */}
          </div>
        )}
      </div>
      
      <div className="flex flex-row justify-center items-center  mx-auto mb-4 rounded-xl w-fit px-4 py-2 bg-[#232323]" style={{ visibility: isOverallTimerRunning ? 'visible' : 'hidden' }}>
        
        <div className="flex items-start gap-[10px]">
          <div className="flex w-[35px] h-[35px] p-[9px] justify-center items-center gap-[15px] self-stretch rounded-[8px] bg-white backdrop-blur-[2.3px]">
            <button onClick={resetAllTimers}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 13 13" fill="none">
                <path d="M2.36389 2.36414L10.8341 2.36414L10.8341 10.8343L2.36389 10.8343L2.36389 2.36414Z" fill="black" stroke="black" stroke-width="2.25871" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
          
          <p className="px-2 text-center leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[15px] font-[493] leading-normal tracking-[-0.3px] text-[#E8E8E8] w-20">{formatTime(activeSession.duration)}</p> {/* Set fixed width */}
        
      </div>
      
    </>
  );
}

export default TimerPage;