import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SessionEvent, TimeBox } from "../lib/types";
import SortingPanel from "../components/ChartSorting";
import ChartSessionPanel from "../components/ChartSessionPanel";

function ChartPage({ sessionEvents, timeBoxes }: { sessionEvents: SessionEvent[], timeBoxes: TimeBox[] }) {
    const [chartType, setChartType] = useState<'session' | 'date'>('session');
    const [groupBy, setGroupBy] = useState<'Week' | 'Month' | 'All'>('Week');
    const [currentPeriod, setCurrentPeriod] = useState<Date>(new Date());
    const [filteredEvents, setFilteredEvents] = useState<SessionEvent[]>([]);

    useEffect(() => {
        filterEvents();
    }, [groupBy, currentPeriod, sessionEvents]);

    const filterEvents = () => {
        let startDate: Date, endDate: Date;
        if (groupBy === 'Week') {
            startDate = getStartOfWeek(currentPeriod);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6); // Change this to 6 instead of 7
        } else if (groupBy === 'Month') {
            startDate = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth(), 1);
            endDate = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth() + 1, 0);
        } else {
            setFilteredEvents(sessionEvents);
            return;
        }

        const filtered = sessionEvents.filter(event => {
            const eventDate = new Date(event.startDatetime);
            return eventDate >= startDate && eventDate <= endDate; // Change to <= instead of <
        });
        setFilteredEvents(filtered);
    };

    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const isCurrentOrFuturePeriod = useCallback(() => {
        const now = new Date();
        if (groupBy === 'Week') {
            const currentWeekStart = getStartOfWeek(now);
            const selectedWeekStart = getStartOfWeek(currentPeriod);
            return selectedWeekStart.getTime() >= currentWeekStart.getTime();
        } else if (groupBy === 'Month') {
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            const selectedYear = currentPeriod.getFullYear();
            const selectedMonth = currentPeriod.getMonth();
            return selectedYear > currentYear || (selectedYear === currentYear && selectedMonth >= currentMonth);
        }
        return false;
    }, [groupBy, currentPeriod]);

    const handlePeriodChange = useCallback((direction: 'prev' | 'next') => {
        const newPeriod = new Date(currentPeriod);
        if (groupBy === 'Week') {
            newPeriod.setDate(newPeriod.getDate() + (direction === 'next' ? 7 : -7));
            // Check if the new period is in the future
            if (getStartOfWeek(newPeriod).getTime() > getStartOfWeek(new Date()).getTime()) {
                return; // Don't update if it's a future week
            }
        } else if (groupBy === 'Month') {
            newPeriod.setMonth(newPeriod.getMonth() + (direction === 'next' ? 1 : -1));
            // Check if the new period is in the future
            const now = new Date();
            if (newPeriod.getFullYear() > now.getFullYear() || 
                (newPeriod.getFullYear() === now.getFullYear() && newPeriod.getMonth() > now.getMonth())) {
                return; // Don't update if it's a future month
            }
        }
        setCurrentPeriod(newPeriod);
    }, [groupBy, currentPeriod]);

    const formatPeriodDisplay = () => {
        if (groupBy === 'Week') {
            const start = getStartOfWeek(currentPeriod);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
        } else if (groupBy === 'Month') {
            return currentPeriod.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        }
        return 'All Time';
    };

    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const prepareChartData = (events: SessionEvent[]) => {
        if (chartType === 'session') {
            const sessions = Array.from(new Set(events.map(event => event.sessionId)));
            let chartData: any[] = [];
            for (const session of sessions) {
                const sessionData = events
                    .filter(event => event.sessionId === session)
                    .reduce((acc, event) => {
                        const timeBox = timeBoxes.find(box => box.id === event.timeBoxId);
                        const boxName = timeBox?.name || 'Unknown';
                        acc[boxName] = (acc[boxName] || 0) + event.seconds;
                        return acc;
                    }, {} as Record<string, number>);
    
                chartData.push({
                    name: `${chartData.length + 1}`,
                    startDatetime: events.filter(event => event.sessionId === session)
                                            .reduce((earliest, event) => 
                                                event.startDatetime < earliest.startDatetime ? event : earliest
                                            ).startDatetime,
                    ...sessionData
                });
            }
            console.log("chartData", chartData);
            return chartData;
        } else {
            let chartData: any[] = [];
            let startDate: Date, endDate: Date;

            if (groupBy === 'Week') {
                startDate = getStartOfWeek(currentPeriod);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                
                // Initialize data for all days of the week
                chartData = weekDays.map((day, index) => ({
                    name: day,
                    fullDate: new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB"),
                    ...Object.fromEntries(timeBoxes.map(box => [box.name, 0]))
                }));
            } else if (groupBy === 'Month') {
                startDate = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth(), 1);
                endDate = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth() + 1, 0);
                
                // Initialize data for all days of the month
                const daysInMonth = endDate.getDate();
                chartData = Array.from({ length: daysInMonth }, (_, i) => ({
                    name: (i + 1).toString(),
                    fullDate: new Date(startDate.getFullYear(), startDate.getMonth(), i + 1).toLocaleDateString("en-GB"),
                    ...Object.fromEntries(timeBoxes.map(box => [box.name, 0]))
                }));
            } else {
                // For 'All', create a data point for each day between the first and last event
                startDate = new Date(Math.min(...events.map(e => new Date(e.startDatetime).getTime())));
                endDate = new Date(Math.max(...events.map(e => new Date(e.startDatetime).getTime())));
                
                const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                
                chartData = Array.from({ length: daysDiff + 1 }, (_, i) => {
                    const date = new Date(startDate);
                    date.setDate(startDate.getDate() + i);
                    return {
                        name: date.toISOString().split('T')[0], // Use ISO date string as name
                        fullDate: date.toLocaleDateString("en-GB"),
                        ...Object.fromEntries(timeBoxes.map(box => [box.name, 0]))
                    };
                });
            }

            // Fill in actual data
            events.forEach(event => {
                const eventDate = new Date(event.startDatetime);
                if (eventDate >= startDate && eventDate <= endDate) {
                    let index: number;
                    if (groupBy === 'Week') {
                        index = (eventDate.getDay() + 6) % 7; // Adjust to make Monday index 0
                    } else if (groupBy === 'Month') {
                        index = eventDate.getDate() - 1; // Arrays are 0-indexed
                    } else {
                        // For 'All', find the index based on the date difference
                        index = Math.floor((eventDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
                    }
                    
                    const timeBox = timeBoxes.find(box => box.id === event.timeBoxId.toString());
                    const boxName = timeBox?.name || 'Unknown';
                    
                    if (chartData[index]) {
                        chartData[index][boxName] = (chartData[index][boxName] || 0) + event.seconds;
                    }
                }
            });

            return chartData;
        }
    };

    const dummyData: { title: string; time: string; color: string; }[] = [
        { title: "Code Reading", time: "8h 45m", color: "#77C8FF" },
        { title: "Break", time: "3h 22m", color: "#FAFF04" },
        { title: "Palta Labs", time: "1h 12m", color: "#FF6E3D" },
        { title: "Chess", time: "10m", color: "#F448ED" },
        { title: "Chess", time: "10m", color: "#F448ED" },
        { title: "Chess", time: "10m", color: "#F448ED" },
        { title: "Chess", time: "10m", color: "#F448ED" }
    ];

    const formatXAxisTick = (tick: string) => {
        if (groupBy === 'All') {
            // Parse the ISO date string and format it
            const date = new Date(tick);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        }
        if (chartType === 'date' && groupBy === 'Week') {
            return tick; // Already formatted as M, T, W, T, F, S, S
        } else if (chartType === 'date' && groupBy === 'Month') {
            const day = parseInt(tick);
            return day === 1 || day % 5 === 0 ? day.toString() : ''; // Show 1, 5, 10, 15, 20, 25, 30
        } else if (chartType === 'date') {
            // For 'All', we'll parse the date string and format it
            const [day, month, year] = tick.split('/');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        } else if (chartType === 'session') {
            return tick;
        }
        return tick;
    };

    const getYAxisTicks = (data: any[]) => {
        const maxSeconds = Math.max(...data.flatMap(Object.values).filter((v): v is number => typeof v === 'number'));
        const maxHours = maxSeconds / 3600;

        if (maxHours < 1) {
            // If less than an hour, use 10-minute intervals
            return Array.from({ length: 7 }, (_, i) => i * 600);
        } else {
            // Use hourly intervals
            const maxTick = Math.ceil(maxHours) * 3600;
            return Array.from({ length: maxTick / 3600 + 1 }, (_, i) => i * 3600);
        }
    };

    const formatYAxisTick = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h`;
        } else {
            return `${minutes}m`;
        }
    };

    const chartData = prepareChartData(filteredEvents);
    const bucketTitles = Array.from(new Set(timeBoxes.map(box => box.name)));
    const yAxisTicks = getYAxisTicks(chartData);

    return (
        <div className="flex flex-col items-center p-2 w-full h-full">
            <div className="flex w-full h-full justify-between items-stretch gap-4"> 
                <div className="w-2/3 min-w-[500px]">
                    <div className="p-0 rounded-[14px] bg-black backdrop-blur-[40px] h-full">
                        <div className="h-full p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <XAxis 
                                        dataKey="name"
                                        tick={{ fill: '#D9D9D9' }}
                                        tickFormatter={formatXAxisTick}
                                        interval={0}
                                        hide={groupBy === 'All'} // Hide entire X-axis for 'All' option
                                    />
                                    <YAxis 
                                        tickFormatter={formatYAxisTick} 
                                        tick={{ fill: '#D9D9D9' }}
                                        ticks={yAxisTicks}
                                    />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(255, 255, 255, 0.1)'}}
                                        formatter={(value: number, name: string) => [formatTime(value), name]}
                                        labelFormatter={(label) => {
                                            if (chartType === 'date') {
                                                const dataPoint = chartData.find(item => item.name === label);
                                                return `${label} - ${dataPoint?.fullDate}`;
                                            }
                                            return `${chartType === 'session' ? 'Session: ' : ''}${label}`;
                                        }}
                                        contentStyle={{ backgroundColor: '#1E1E1E', border: 'none' }}
                                        labelStyle={{ color: '#D9D9D9' }}
                                    />
                                    <Legend wrapperStyle={{ color: '#D9D9D9' }} />
                                    {bucketTitles.map((title, index) => (
                                        <Bar key={title} dataKey={title} stackId="a" fill={`hsl(${index * 360 / bucketTitles.length}, 70%, 50%)`} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="flex w-1/3 flex-col gap-4 flex-shrink-0 min-w-[300px] h-full">
                    <div className="flex-shrink-0">
                        <SortingPanel 
                            chartType={chartType} 
                            setChartType={setChartType}
                            groupBy={groupBy}
                            setGroupBy={setGroupBy}
                            currentPeriod={formatPeriodDisplay()}
                            onPeriodChange={handlePeriodChange}
                            disableForwardNavigation={isCurrentOrFuturePeriod()}
                        />
                    </div>
                    <div className="flex-grow overflow-auto">
                        <ChartSessionPanel elements={dummyData} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChartPage;