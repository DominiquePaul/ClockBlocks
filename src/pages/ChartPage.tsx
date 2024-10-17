import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { SessionEvent, TimeBox } from "../lib/types";
import SortingPanel from "../components/ChartSorting";
import ChartSessionPanel from "../components/ChartSessionPanel";
import { formatSeconds, formatTime } from "../lib/utils";
import { useSession } from '../context/SessionContext';

function ChartPage({ timeBoxes }: { timeBoxes: TimeBox[] }) {
    const { sessionEvents } = useSession(); // Use the sessionEvents from context
    const [chartType, setChartType] = useState<'session' | 'date'>('date');
    const [groupBy, setGroupBy] = useState<'Week' | 'Month' | 'All'>('Week');
    const [currentPeriod, setCurrentPeriod] = useState<Date>(new Date());
    const [filteredEvents, setFilteredEvents] = useState<SessionEvent[]>([]);
    const [selectedBarData, setSelectedBarData] = useState<{ barData: { title: string; time: number; color: string; }[], sessionId: string, sessionStart: string, sessionNumber: string, title: string }>({ barData: [], sessionId: '', sessionStart: '', sessionNumber: '', title: '' });
    const [sessionIndexMap, setSessionIndexMap] = useState<Record<string, number>>({});
    const [isModalOpen, setIsModalOpen] = useState(false)

    const getStartOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(d.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0); // Set the time to 00:00
      return startOfWeek;
  };

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    // Move the prepareChartData function definition before the useMemo hook
    const prepareChartData = useCallback((events: SessionEvent[]) => {
        if (chartType === 'session') {
            const sessions = Array.from(new Set(events.map(event => event.sessionId)));
            let chartData: any[] = [];
            sessions.forEach((session) => {
                const sessionData = events
                    .filter(event => event.sessionId === session)
                    .reduce((acc, event) => {
                        const timeBox = timeBoxes.find(box => box.id === event.timeBoxId);
                        const boxName = timeBox?.name || 'Unknown';
                        acc[boxName] = (acc[boxName] || 0) + event.seconds;
                        return acc;
                    }, {} as Record<string, number>);
    
                chartData.push({
                    name: `#${sessionIndexMap[session]}`,
                    sessionId: session,
                    startDatetime: events.filter(event => event.sessionId === session)
                                          .reduce((earliest, event) => 
                                              event.startDatetime < earliest.startDatetime ? event : earliest
                                            ).startDatetime,
                    ...sessionData
                });
            });
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
                endDate = new Date();
                
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
    }, [timeBoxes, chartType, groupBy, currentPeriod, sessionIndexMap]);

    // Now use useMemo with the properly defined prepareChartData function
    const chartData = useMemo(() => prepareChartData(filteredEvents), [prepareChartData, filteredEvents]);

    useEffect(() => {
        filterEvents();
    }, [groupBy, currentPeriod, sessionEvents]);

    useEffect(() => {
        // Update selected bar data when chart data changes
        if (selectedBarData.sessionId) {
            const updatedBarData = chartData.find(data => data.sessionId === selectedBarData.sessionId);
            if (updatedBarData) {
                handleBarClick(updatedBarData, 0);
            }
        }
    }, [chartData, selectedBarData.sessionId]);

    useEffect(() => {
      // Create a mapping of session IDs to their indices
      const newSessionIndexMap: Record<string, number> = {};
      const uniqueSessionIds = Array.from(new Set(sessionEvents.map(event => event.sessionId)));
      uniqueSessionIds.forEach((sessionId, index) => {
          newSessionIndexMap[sessionId] = index+1; // Use unique session IDs
      });
      setSessionIndexMap(newSessionIndexMap); // Update state with the new mapping
  }, [sessionEvents]);

    const filterEvents = () => {
        let startDate: Date, endDate: Date;
        if (groupBy === 'Week') {
            startDate = getStartOfWeek(currentPeriod);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else if (groupBy === 'Month') {
            startDate = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth(), 1);
            endDate = new Date(currentPeriod.getFullYear(), currentPeriod.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
        } else {
            setFilteredEvents(sessionEvents);
            return;
        }

        const filtered = sessionEvents.filter(event => {
            const eventDate = new Date(event.startDatetime);
            return eventDate >= startDate && eventDate <= endDate;
        });

        // Only update state if the filtered events have changed
        if (JSON.stringify(filtered) !== JSON.stringify(filteredEvents)) {
            setFilteredEvents(filtered);
        }
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
            return `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${end.getMonth() === start.getMonth() ? end.toLocaleDateString('en-GB', { day: '2-digit' }) : end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
        } else if (groupBy === 'Month') {
            return currentPeriod.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        }
        return 'All Time';
    };

    const formatXAxisTick = (tick: string, index: number) => {
        if (chartType === "date") {
            if (groupBy === 'Week') {
                return tick; // Already formatted as M, T, W, T, F, S, S
            } else if (groupBy === 'Month') {
                const day = parseInt(tick);
                return day === 1 || day % 5 === 0 ? day.toString() : ''; // Show 1, 5, 10, 15, 20, 25, 30
            } else {
                return tick;
            }
        } else if (chartType === 'session') {
            if (index === 0 || index === chartData.length - 1) {
                return tick; // Show only the first and last item
            } else {
                return ''; // Hide other ticks
            }
        }
        return ''; // Ensure a string is always returned
    };

    const getYAxisTicks = (data: any[]) => {
        const maxSeconds = Math.max(...data.map(item => 
          Object.values(item).reduce((sum: number, value) => 
            typeof value === 'number' ? sum + value : sum, 0
          )
        ).filter((value): value is number => typeof value === 'number'));
        const maxHours = maxSeconds / 3600;

        if (maxHours < 1) {
            // If less than an hour, use 10-minute intervals
            return Array.from({ length: 7 }, (_, i) => i * 600);
        } else {
            // Use hourly intervals, extending beyond 8 hours if necessary
            const baseHours = Math.ceil(maxHours / 2) * 2; // Round up to the nearest even number of hours
            const maxTick = Math.max(8, baseHours) * 3600; // Ensure at least 8 hours, but extend if needed
            return Array.from({ length: maxTick / 7200 + 1 }, (_, i) => i * 7200); // Increment by 2 hours (7200 seconds)
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

    const yAxisTicks = getYAxisTicks(chartData);


    const handleBarClick = (data: any, _: number) => {
        // console.log(data);
        const barData = Object.entries(data)
            .filter(([key, value]) => 
                key !== 'name' && 
                key !== 'fullDate' && 
                key !== 'x' && 
                key !== 'y' && 
                key !== 'width' && 
                key !== 'height' && 
                key !== 'unknown' && 
                key !== 'Unknown' && 
                typeof value === 'number' && 
                value > 0
            )
            .map(([key, value]) => ({
                title: key,
                time: value as number,
                color: getTimeBoxColor(key), // Changed from colour to color
            }))
            .sort((a, b) => b.time - a.time); 
        setSelectedBarData({barData, sessionId: data.sessionId, sessionStart: data.startDatetime, sessionNumber: data.name, title: data.sessionId ? `Session ${data.name}` : formatTooltipDate(data.fullDate)});
    };

    const handleChartClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const clickedData = data.activePayload[0].payload;
            handleBarClick(clickedData, data.activeTooltipIndex);
        }
    };

    const formatTooltipDate = (dateString: string | undefined) => {
        if (!dateString) return 'Invalid date';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    };

    const bucketTitles = Array.from(new Set(timeBoxes.map(box => box.name)));

    const getTimeBoxColor = (timeBoxName: string) => {
        const timeBox = timeBoxes.find(box => box.name === timeBoxName);
        return timeBox?.colour || `hsl(${Math.random() * 360}, 70%, 50%)`;
    };

    return (
        <div className="flex flex-col items-center h-full min-w-[722px] max-w-[1200px] w-[90vw]">
            <div className="flex justify-between items-stretch gap-3 h-[70vh] w-full"> 
                <div className="w-2/3">
                    <div className="p-8 h-full rounded-[14px] bg-black backdrop-blur-[40px] flex flex-col">
                        <div className="flex flex-col mb-4">
                            <p className="text-[rgba(217,217,217,0.30)] leading-trim text-edge-cap font-inter text-sm font-normal leading-normal">
                                {(() => {
                                    const start = getStartOfWeek(currentPeriod);
                                    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
                                    const startString = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                    const endString = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                    
                                    if (start.getFullYear() === end.getFullYear()) {
                                        if (start.getMonth() === end.getMonth()) {
                                            return `${start.toLocaleDateString('en-GB', { day: 'numeric' })} - ${endString}`;
                                        }
                                        return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${endString}`;
                                    }
                                    return `${startString} - ${endString}`;
                                })()}
                            </p>
                            <p className="text-[#D9D9D9] leading-trim text-edge-cap font-inter text-[28px] font-normal leading-normal">
                                Total time: {formatSeconds(filteredEvents.reduce((total, event) => total + event.seconds, 0))}
                            </p>
                        </div>
                        <div className="flex-grow">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={chartData} 
                                    onClick={handleChartClick}
                                    margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                                >
                                    <XAxis 
                                        dataKey="name"
                                        tick={{ fill: '#5E5E5E', fontSize: 10 }}
                                        tickFormatter={(value, index) => formatXAxisTick(value, index)} // Removed additionalArg
                                        interval={0}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis 
                                        tickFormatter={formatYAxisTick} 
                                        tick={{ fill: '#5E5E5E', fontSize: 10 }}
                                        ticks={yAxisTicks}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={[0, 'dataMax']}
                                        width={50}
                                    />
                                    <Tooltip 
                                        cursor={false}
                                        content={({ active, payload, label }) => {
                                            if (active && payload) {
                                                const sessionData = payload[0]?.payload || {};
                                                const hasData = payload.some(entry => entry?.value ?? 0 > 0);
                                                
                                                let displayDate;
                                                let sessionDate;
                                                if (chartType === 'date') {
                                                    if (groupBy === 'Week') {
                                                        // For week view, construct the date from the label (day of week)
                                                        const weekStart = getStartOfWeek(currentPeriod);
                                                        const dayIndex = weekDays.indexOf(label);
                                                        if (dayIndex !== -1) {
                                                            const date = new Date(weekStart);
                                                            date.setDate(date.getDate() + dayIndex);
                                                            displayDate = formatTooltipDate(date.toISOString());
                                                            sessionDate = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                                                        } else {
                                                            displayDate = 'Invalid date';
                                                            sessionDate = 'Invalid date';
                                                        }
                                                    } else {
                                                        // For month and all views
                                                        displayDate = formatTooltipDate(sessionData.fullDate);
                                                        sessionDate = new Date(sessionData.fullDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                                                    }
                                                } else {
                                                    // For session view
                                                    displayDate = `Session ${sessionData.name}` || label;
                                                    sessionDate = new Date(sessionData.startDatetime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                                                }

                                                return (
                                                    <div className="bg-[#1E1E1E] p-2 rounded-lg text-[#D9D9D9] text-xs">
                                                        <p className="font-bold mb-1">{displayDate}</p>
                                                        <p className="mb-1">{sessionDate}</p>
                                                        {hasData ? (
                                                            payload.map((entry: any, index: number) => (
                                                                (entry?.value ?? 0) > 0 && (
                                                                    <div key={index} className="flex items-center">
                                                                        <div 
                                                                            className="w-3 h-3 rounded-full mr-2" 
                                                                            style={{ backgroundColor: getTimeBoxColor(entry.name) }}></div>
                                                                        <p>
                                                                            {entry.name}: {formatTime(entry.value)}
                                                                        </p>
                                                                    </div>
                                                                )
                                                            ))
                                                        ) : (
                                                            <p>No data for this day</p>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend 
                                        wrapperStyle={{ 
                                            color: '#D9D9D9', 
                                            fontSize: '12px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-around',
                                            width: '100%',
                                        }} 
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                      {yAxisTicks.map((tick) => (
                                          <ReferenceLine
                                              key={tick}
                                              y={tick}
                                              stroke="#5E5E5E"
                                              strokeWidth={0.5}
                                          />
                                      ))}
                                    {bucketTitles.map((title) => (
                                        <Bar 
                                            key={title} 
                                            dataKey={title} 
                                            stackId="a" 
                                            fill={getTimeBoxColor(title)}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="flex h-full w-1/3 flex-col gap-3 flex-shrink-0 min-w-[300px]">
                    <div className="flex-shrink-0 h-[140px]">
                        <SortingPanel 
                            chartType={chartType} 
                            setChartType={setChartType}
                            groupBy={groupBy}
                            setGroupBy={setGroupBy}
                            currentPeriod={formatPeriodDisplay()}
                            onPeriodChange={handlePeriodChange}
                            disableForwardNavigation={isCurrentOrFuturePeriod()}
                            disableShortcuts={isModalOpen}
                        />
                    </div>
                    <div className="flex-1 overflow-auto">
                        <ChartSessionPanel elements={selectedBarData} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChartPage;