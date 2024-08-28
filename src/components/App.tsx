import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import TimerPage from './TimerPage';
import ChartPage from './ChartPage';
import SettingsPage from './SettingsPage';
import IconButton from './IconButton';
import { Timer, Settings, ChartColumn } from "lucide-react";
import backgroundImage from "/background.png";

interface Box {
  id: number;
  title: string;
  time: number;
  isActive: boolean;
}

interface Session {
  startDate: string;
  endDate: string;
  buckets: { id: number; title: string; time: number }[];
}

function App() {
  const [boxes, setBoxes] = useState<Box[]>([
    { id: 1, title: "Read", time: 0, isActive: false },
    { id: 2, title: "Calls", time: 0, isActive: false },
    { id: 3, title: "Code", time: 0, isActive: false },
    { id: 4, title: "Write", time: 0, isActive: false },
  ]);

  const [activeBox, setActiveBox] = useState<number | null>(null);
  const [overallTime, setOverallTime] = useState(0);
  const [isOverallTimerRunning, setIsOverallTimerRunning] = useState(false);
  const [activePage, setActivePage] = useState('timer');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  useEffect(() => {
    // Load saved boxes from storage when the app starts
    invoke<Box[]>("load_boxes").then((savedBoxes) => {
      if (savedBoxes && savedBoxes.length > 0) {
        setBoxes(savedBoxes);
      }
    }).catch((error) => console.error("Failed to load boxes:", error));

    // Load saved sessions from storage
    invoke<Session[]>("load_sessions").then((savedSessions) => {
      if (savedSessions && savedSessions.length > 0) {
        setSessions(savedSessions);
      }
    }).catch((error) => console.error("Failed to load sessions:", error));
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (activeBox !== null) {
      if (!isOverallTimerRunning) {
        setIsOverallTimerRunning(true);
        setSessionStartTime(new Date());
      }
      interval = setInterval(() => {
        setBoxes(prevBoxes =>
          prevBoxes.map(box =>
            box.id === activeBox
              ? { ...box, time: box.time + 1 }
              : box
          )
        );
        setOverallTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeBox, isOverallTimerRunning]);

  const handleBoxClick = (id: number) => {
    setBoxes(prevBoxes =>
      prevBoxes.map(box =>
        box.id === id
          ? { ...box, isActive: true }
          : { ...box, isActive: false }
      )
    );
    setActiveBox(id);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const resetAllTimers = () => {
    setActiveBox(null);
    setOverallTime(0);
    setIsOverallTimerRunning(false);
    
    // Save the session data before resetting
    if (sessionStartTime) {
      const session: Session = {
        startDate: sessionStartTime.toISOString(),
        endDate: new Date().toISOString(),
        buckets: boxes.map(box => ({ id: box.id, title: box.title, time: box.time }))
      };
      
      setSessions(prevSessions => [...prevSessions, session]);
      
      invoke("save_session", { session })
        .then(() => console.log("Session saved successfully"))
        .catch((error) => console.error("Failed to save session:", error));
    }

    setSessionStartTime(null);

    setBoxes(prevBoxes =>
      prevBoxes.map(box => ({ ...box, time: 0, isActive: false }))
    );

    // Save the reset boxes state
    invoke("save_boxes", { boxes: boxes.map(box => ({ ...box, time: 0, isActive: false })) })
      .then(() => console.log("Boxes saved successfully"))
      .catch((error) => console.error("Failed to save boxes:", error));
  };

  return (
    <div className="flex flex-col h-[100vh] bg-cover bg-center pt-3" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="flex flex-row justify-center items-center h-[30px] mx-auto rounded-2xl w-fit bg-[#D9D9D9]">
        <IconButton icon={Timer} onClick={() => setActivePage('timer')} isActive={activePage === 'timer'} />
        <IconButton icon={ChartColumn} onClick={() => setActivePage('chart')} isActive={activePage === 'chart'} />
        <IconButton icon={Settings} onClick={() => setActivePage('settings')} isActive={activePage === 'settings'} />
      </div>
      {activePage === 'timer' && <TimerPage boxes={boxes} handleBoxClick={handleBoxClick} formatTime={formatTime} isOverallTimerRunning={isOverallTimerRunning} overallTime={overallTime} resetAllTimers={resetAllTimers} />}
      {activePage === 'chart' && <ChartPage sessions={sessions} />}
      {activePage === 'settings' && <SettingsPage boxes={boxes} setBoxes={setBoxes} />}
    </div>
  );
}

export default App;
