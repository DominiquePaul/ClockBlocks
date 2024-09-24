import Box from '../components/Box';
import { TimeBox, Session } from "../lib/types";
import IconButton from '../components/IconButton';
import { StopCircle } from "lucide-react";

function TimerPage({ boxes, handleTimeBoxClick, formatTime, activeSession, resetAllTimers }: {   boxes: TimeBox[]; handleTimeBoxClick: (id: string) => void; formatTime: (seconds: number) => string; activeSession: Session; resetAllTimers: () => void }) {
  const isOverallTimerRunning = activeSession && activeSession.startDatetime
  return (
    <>
      <div className="flex flex-grow flex-wrap justify-center items-center gap-[10px] p-2 w-fit mx-auto overflow-auto">
        {boxes.slice(0, 8).map(box => (
          <Box
            key={box.id}
            name={box.name}
            seconds={formatTime(box.seconds)}
            isActive={box.isActive}
            onClick={() => handleTimeBoxClick(box.id)}
          />
        ))}
      </div>
      <div className="flex flex-row justify-center items-center h-[30px] mx-auto mb-4 rounded-2xl w-fit bg-[#D9D9D9] px-1" style={{ visibility: isOverallTimerRunning ? 'visible' : 'hidden' }}>
        <IconButton icon={StopCircle} onClick={resetAllTimers} isActive={true} />
        <p className="px-2">{formatTime(activeSession.duration)}</p>
      </div>
    </>
  );
}

export default TimerPage;