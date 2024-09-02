import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Bucket {
  id: number;
  uniqueId: string; // Add this line
  title: string;
  time: number;
}

interface Session {
  startDate: string;
  endDate: string;
  buckets: Bucket[]; // Update this line
}

// Assuming you have a way to get the last-used titles based on uniqueId
const lastUsedTitles: Record<string, string> = {}; // This should be populated with uniqueId to last-used title mapping

function ChartPage({ SessionEvents }: { SessionEvents: Session[] }) {
    const [chartType, setChartType] = useState<'session' | 'date'>('session');
  
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
  
    const prepareChartData = () => {
      if (chartType === 'session') {
        return SessionEvents.map((session, index) => ({
          name: `Session ${index + 1}`,
          ...session.buckets.reduce((acc, bucket) => {
            const title = lastUsedTitles[bucket.uniqueId] || bucket.title; // Use last-used title if available
            return {
              ...acc,
              [title]: bucket.time
            };
          }, {})
        }));
      } else {
        return SessionEvents.map(session => ({
          name: new Date(session.startDate).toLocaleDateString(),
          ...session.buckets.reduce((acc, bucket) => {
            const title = lastUsedTitles[bucket.uniqueId] || bucket.title; // Use last-used title if available
            return {
              ...acc,
              [title]: bucket.time
            };
          }, {})
        }));
      }
    };
  
    const chartData = prepareChartData();
    const bucketTitles = Array.from(new Set(SessionEvents.flatMap(s => s.buckets.map(b => b.title))));
  
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
                <td className="border p-2">{new Date(SessionEvents[index].startDate).toLocaleString()}</td>
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