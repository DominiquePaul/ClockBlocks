import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SessionEvent, TimeBox } from "../lib/types";
import SortingPanel from "../components/ChartSorting";
import ChartSessionPanel from "../components/ChartSessionPanel";

function ChartPage({ sessionEvents, timeBoxes }: { sessionEvents: SessionEvent[], timeBoxes: TimeBox[] }) {
    const [chartType, setChartType] = useState<'session' | 'date'>('session');
  
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
  
    const prepareChartData = () => {
      const sessions = Array.from(new Set(sessionEvents.map(event => event.sessionId)));
      if (chartType === 'session') {
        let chartData: any[] = [];
        for (const session of sessions) {
          const sessionData = sessionEvents
            .filter(event => event.sessionId === session)
            .reduce((acc, event) => {
              const timeBox = timeBoxes.find(box => box.id === event.timeBoxId);
              const boxName = timeBox?.name || 'Unknown';
              acc[boxName] = (acc[boxName] || 0) + event.seconds;
              return acc;
            }, {} as Record<string, number>);
  
          chartData.push({
            name: `Session ${chartData.length + 1}`,
            startDatetime: sessionEvents.filter(event => event.sessionId === session)
                                        .reduce((earliest, event) => 
                                            event.startDatetime < earliest.startDatetime ? event : earliest
                                        ).startDatetime,
            ...sessionData
          });
        }
        console.log("chartData", chartData);
        return chartData;
      } else {
        const dateMap: Record<string, Record<string, number>> = {};
        sessionEvents.forEach(event => {
          const date = new Date(event.startDatetime).toLocaleDateString("en-GB");
          const timeBox = timeBoxes.find(box => box.id === event.timeBoxId.toString());
          if (!dateMap[date]) {
            dateMap[date] = {};
          }
          const boxName = timeBox?.name || 'Unknown';
          dateMap[date][boxName] = (dateMap[date][boxName] || 0) + event.seconds;
        });
        return Object.entries(dateMap).map(([date, data]) => ({
          name: date,
          ...data
        }));
      }
    };

    const dummyData: { title: string; time: string; color: string; }[] = [
      { title: "Code Reading", time: "8h 45m", color: "#77C8FF" },
      { title: "Break", time: "3h 22m", color: "#FAFF04" },
      { title: "Palta Labs", time: "1h 12m", color: "#FF6E3D" },
      { title: "10m", time: "10m", color: "#F448ED" }
    ];

  
    const chartData = prepareChartData();
    const bucketTitles = Array.from(new Set(timeBoxes.map(box => box.name)));
  
    return (
      <div className="flex flex-col items-center p-2 overflow-auto w-full">
        <div className="flex w-full justify-between items-center mb-4"> 
          <h1 className="text-2xl font-bold">Time Tracking Chart</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">View by:</span>
            <button
              className={`px-3 py-1 rounded ${chartType === 'session' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setChartType('session')}
            >
              Session
            </button>
            <button
              className={`px-3 py-1 rounded ${chartType === 'date' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setChartType('date')}
            >
              Date
            </button>
          </div>
        </div>
        <div className="flex w-full justify-between items-start"> 
          <div className="w-2/3 h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatTime} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  formatter={(value: number, name: string) => [formatTime(value), name]}
                  labelFormatter={(label) => `${chartType === 'session' ? 'Session' : 'Date'}: ${label}`}
                />
                <Legend />
                {bucketTitles.map((title, index) => (
                  <Bar key={title} dataKey={title} stackId="a" fill={`hsl(${index * 360 / bucketTitles.length}, 70%, 50%)`} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex w-1/3 flex-col gap-5 flex-shrink-0">
            <div className="flex-1">
              <SortingPanel />
            </div>
            <div className="flex-3">
              <ChartSessionPanel elements={dummyData} />
            </div>
          </div>
        </div>
      </div>
    );
  }

export default ChartPage;