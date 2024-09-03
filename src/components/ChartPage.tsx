import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SessionEvent } from "../types";

function ChartPage({ sessionEvents }: { sessionEvents: SessionEvent[] }) {
    const [chartType, setChartType] = useState<'session' | 'date'>('session');
  
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
  
    const prepareChartData = () => {
      if (chartType === 'session') {
        return sessionEvents.map((session, index) => ({
          name: `Session ${index + 1}`,
          [session.boxTitle]: session.seconds
        }));
      } else {
        const dateMap: Record<string, Record<string, number>> = {};
        sessionEvents.forEach(session => {
          const date = new Date(session.startDatetime).toLocaleDateString();
          if (!dateMap[date]) {
            dateMap[date] = {};
          }
          dateMap[date][session.boxTitle] = (dateMap[date][session.boxTitle] || 0) + session.seconds;
        });
        return Object.entries(dateMap).map(([date, data]) => ({
          name: date,
          ...data
        }));
      }
    };
  
    const chartData = prepareChartData();
    const bucketTitles = Array.from(new Set(sessionEvents.map(s => s.boxTitle)));
  
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
            <YAxis tickFormatter={(value) => formatTime(value)} />
            <Tooltip 
              formatter={(value: number, name: string) => [formatTime(value), name]}
              labelFormatter={(label) => `${chartType === 'session' ? 'Session' : 'Date'}: ${label}`}
            />
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
                <td className="border p-2">{new Date(sessionEvents[index].startDatetime).toLocaleString()}</td>
                {bucketTitles.map(title => (
                  <td key={title} className="border p-2">{formatTime((row as any)[title] || 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  export default ChartPage;