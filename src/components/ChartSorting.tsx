import {Arrow} from "./Icons"
import { useEffect } from 'react';
import Dropdown from './DropDownButton';


interface SortingPanelProps {
    chartType: 'session' | 'date';
    setChartType: (type: 'session' | 'date') => void;
    groupBy: 'Week' | 'Month' | 'All';
    setGroupBy: (groupBy: 'Week' | 'Month' | 'All') => void;
    currentPeriod: string;
    onPeriodChange: (direction: 'prev' | 'next') => void;
    disableForwardNavigation: boolean;
}

function ArrowButton({ orientation, onClick }: { orientation: 'left' | 'right' | 'up' | 'down', onClick: () => void }) {
    return (
        <button 
            className="flex w-5 h-5 p-1.5 justify-center items-center gap-6.75 rounded border border-white border-opacity-10 backdrop-blur"
            onClick={onClick}
        >
            <Arrow orientation={orientation} />
        </button>
    )
}

export default function SortingPanel({ 
    chartType, 
    setChartType, 
    groupBy, 
    setGroupBy, 
    currentPeriod, 
    onPeriodChange,
    disableForwardNavigation,
    disableShortcuts // New prop to disable keyboard shortcuts
}: SortingPanelProps & { disableShortcuts?: boolean }) { // Updated props interface
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (disableShortcuts) return; // Exit if shortcuts are disabled

            if (event.key.toLowerCase() === 's') {
                setChartType('session');
            } else if (event.key.toLowerCase() === 'd') {
                setChartType('date');
            } else if (event.key.toLowerCase() === 'w') {
                setGroupBy('Week');
            } else if (event.key.toLowerCase() === 'm') {
                setGroupBy('Month');
            } else if (event.key.toLowerCase() === 'a') {
                setGroupBy('All');
            }

            // Only allow navigation when not in 'All' mode
            if (groupBy !== 'All') {
                if (event.key === 'ArrowLeft') {
                    onPeriodChange('prev');
                } else if (event.key === 'ArrowRight' && !disableForwardNavigation) {
                    onPeriodChange('next');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [groupBy, onPeriodChange, setChartType, setGroupBy, disableForwardNavigation, disableShortcuts]); // Added disableShortcuts to dependencies

    return (
        <div className="flex w-full p-4 flex-col items-start gap-2 rounded-[14px] bg-black backdrop-blur-[40px]">
            <div className="flex w-full flex-col items-start gap-4">
                <div className="flex justify-between items-center self-stretch">
                    <p className="text-[#D9D9D9] leading-trim text-edge-cap text-[14px] font-normal leading-normal">Group by</p>
                    <Dropdown
                        options={[
                            { id: 'Week', name: 'Week' },
                            { id: 'Month', name: 'Month' },
                            { id: 'All', name: 'All' }
                        ]}
                        value={groupBy} // Ensure groupBy is the id of the selected option
                        onChange={(value) => setGroupBy(value as 'Week' | 'Month' | 'All')}
                        textSize="text-sm"
                    />
                </div>

                <div className="flex justify-between items-center self-stretch">
                    <p className="text-[#D9D9D9] leading-trim text-edge-cap text-[14px] font-normal leading-normal">Bars show</p>
                    <div className="flex rounded border border-white border-opacity-10 overflow-hidden">
                        <button
                            className={`px-3 py-1 text-sm ${chartType === 'session' ? 'bg-white text-black' : 'bg-transparent text-white'}`}
                            onClick={() => setChartType('session')}
                        >
                            Session
                        </button>
                        <button
                            className={`px-3 py-1 text-sm ${chartType === 'date' ? 'bg-white text-black' : 'bg-transparent text-white'}`}
                            onClick={() => setChartType('date')}
                        >
                            Date
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center self-stretch h-[20px]">
                    {groupBy === 'All' ? (
                        <p className="text-white text-center leading-trim text-edge-cap text-sm leading-normal w-full">All data</p>
                    ) : (
                        <>
                            <ArrowButton orientation="left" onClick={() => onPeriodChange('prev')} />
                            <p className="text-white text-center leading-trim text-edge-cap text-sm eading-normal">{currentPeriod}</p>
                            {!disableForwardNavigation ? (
                                <ArrowButton orientation="right" onClick={() => onPeriodChange('next')} />
                            ) : (
                                <div className="w-5 h-5" /> // Placeholder to maintain layout
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}