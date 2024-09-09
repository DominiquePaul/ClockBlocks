import Box from './Box';
import { TimeBox } from "../types";
import IconButton from './IconButton';
import { StopCircle } from "lucide-react";

function TimerPage({ boxes, handleBoxClick, formatTime, isOverallTimerRunning, overallTime, resetAllTimers }: { boxes: TimeBox[]; handleBoxClick: (id: string) => void; formatTime: (seconds: number) => string; isOverallTimerRunning: boolean; overallTime: number; resetAllTimers: () => void }) {
  return (
    <>
      <div className="flex flex-grow flex-wrap justify-center items-center gap-[10px] p-2 w-fit mx-auto overflow-auto">
        {boxes.slice(0, 8).map(box => (
          <Box
            key={box.id}
            name={box.name}
            seconds={formatTime(box.seconds)}
            isActive={box.isActive}
            onClick={() => handleBoxClick(box.id)}
          />
        ))}
      </div>
      <div className="flex flex-row justify-center items-center h-[30px] mx-auto mb-4 rounded-2xl w-fit bg-[#D9D9D9] px-1" style={{ visibility: isOverallTimerRunning ? 'visible' : 'hidden' }}>
        <IconButton icon={StopCircle} onClick={resetAllTimers} isActive={true} />
        <p className="px-2">{formatTime(overallTime)}</p>
      </div>
    </>
  );
}

export default TimerPage;