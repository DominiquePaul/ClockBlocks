import { useState, useEffect } from "react";
import { Timer, Settings, ChartColumn, StopCircle, Edit2, Trash2, PlusCircle } from "lucide-react";
import backgroundImage from "/background.png";
import { invoke } from "@tauri-apps/api/tauri";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

function IconButton({ icon: Icon, onClick, isActive }: { icon: React.ElementType; onClick?: () => void; isActive: boolean }) {
  return (
    <button className={`px-2 h-full flex items-center justify-center `} onClick={onClick}>
      <Icon strokeWidth={1} className={`h-[20px] ${isActive ? '' : 'text-gray-400'}`} />
    </button>
  );
}

function TimerPage({ boxes, handleBoxClick, formatTime, isOverallTimerRunning, overallTime, resetAllTimers }: { boxes: Box[]; handleBoxClick: (id: number) => void; formatTime: (seconds: number) => string; isOverallTimerRunning: boolean; overallTime: number; resetAllTimers: () => void }) {
  return (
    <>
      <div className="flex flex-grow flex-wrap justify-center items-center gap-[10px] p-2 w-fit mx-auto overflow-auto">
        {boxes.slice(0, 8).map(box => (
          <Box
            key={box.id}
            title={box.title}
            time={formatTime(box.time)}
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

function ChartPage({ sessions }: { sessions: Session[] }) {
  const [chartType, setChartType] = useState<'session' | 'date'>('session');

  const prepareChartData = () => {
    if (chartType === 'session') {
      return sessions.map((session, index) => ({
        name: `Session ${index + 1}`,
        ...session.buckets.reduce((acc, bucket) => ({
          ...acc,
          [bucket.title]: bucket.time
        }), {})
      }));
    } else {
      return sessions.map(session => ({
        name: new Date(session.startDate).toLocaleDateString(),
        ...session.buckets.reduce((acc, bucket) => ({
          ...acc,
          [bucket.title]: bucket.time
        }), {})
      }));
    }
  };

  const chartData = prepareChartData();
  const bucketTitles = Array.from(new Set(sessions.flatMap(s => s.buckets.map(b => b.title))));

  return (
    <div className="flex flex-col items-center p-4 overflow-auto">
      <h2 className="text-xl font-bold mb-4">Time Allocation Chart</h2>
      
      <div className="mb-4">
        <label className="mr-2">Chart Type:</label>
        <select 
          value={chartType} 
          onChange={(e) => setChartType(e.target.value as 'session' | 'date')}
          className="p-2 border rounded"
        >
          <option value="session">By Session</option>
          <option value="date">By Date</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip cursor={false} />
          <Legend />
          {bucketTitles.map((title, index) => (
            <Bar key={title} dataKey={title} stackId="a" fill={`hsl(${index * 360 / bucketTitles.length}, 70%, 50%)`} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <h3 className="text-lg font-semibold mt-8 mb-2">Time Allocation Table</h3>
      <table className="w-full border-collapse border">
        <thead>
          <tr>
            <th className="border p-2">{chartType === 'session' ? 'Session' : 'Date'}</th>
            <th className="border p-2">Start Date</th>
            {bucketTitles.map(title => (
              <th key={title} className="border p-2">{title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chartData.map((row, index) => (
            <tr key={index}>
              <td className="border p-2">{row.name}</td>
              <td className="border p-2">{new Date(sessions[index].startDate).toLocaleString()}</td>
              {bucketTitles.map(title => (
                <td key={title} className="border p-2">{(row as any)[title] || 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsPage({ boxes, setBoxes }: { boxes: Box[]; setBoxes: React.Dispatch<React.SetStateAction<Box[]>> }) {
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');

  const handleRename = (id: number, newTitle: string) => {
    setBoxes(prevBoxes =>
      prevBoxes.map(box =>
        box.id === id ? { ...box, title: newTitle } : box
      )
    );
  };

  const handleDelete = (id: number) => {
    setBoxes(prevBoxes => prevBoxes.filter(box => box.id !== id));
  };

  const handleAdd = () => {
    const newId = Math.max(...boxes.map(box => box.id)) + 1;
    setBoxes(prevBoxes => [...prevBoxes, { id: newId, title: "New Bucket", time: 0, isActive: false }]);
  };

  return (
    <div className="flex flex-col items-center p-4 overflow-auto">
      <h2 className="text-xl font-bold mb-4">Settings</h2>
      
      <div className="w-full max-w-md mb-6">
        <label htmlFor="googleSheetsUrl" className="block mb-2">Google Sheets URL:</label>
        <input
          id="googleSheetsUrl"
          type="url"
          value={googleSheetsUrl}
          onChange={(e) => setGoogleSheetsUrl(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter Google Sheets URL"
        />
      </div>

      <h3 className="text-lg font-semibold mb-2">Time Buckets</h3>
      {boxes.map(box => (
        <div key={box.id} className="flex items-center mb-2 w-full max-w-md">
          <input
            value={box.title}
            onChange={(e) => handleRename(box.id, e.target.value)}
            className="flex-grow p-2 border rounded mr-2"
          />
          <button onClick={() => handleDelete(box.id)} className="p-2 bg-red-500 text-white rounded">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button onClick={handleAdd} className="mt-2 p-2 bg-green-500 text-white rounded flex items-center">
        <PlusCircle size={16} className="mr-1" /> Add New Bucket
      </button>
    </div>
  );
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
