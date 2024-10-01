import {Arrow} from "./Icons"
import { useState, useEffect } from 'react';

interface DropdownProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
}

function Dropdown({ options, value, onChange }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-[143px] p-[4px_8px] justify-between items-center rounded border border-white border-opacity-10 backdrop-blur cursor-pointer"
            >
                <p className="text-white text-center leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[12px] font-[493] leading-normal">
                    {value}
                </p>
                <Arrow orientation={isOpen ? "down" : "right"} />
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 rounded border border-white border-opacity-10 backdrop-blur bg-black overflow-hidden z-10">
                    {options.map((option) => (
                        <div
                            key={option}
                            onClick={() => {
                                onChange(option);
                                setIsOpen(false);
                            }}
                            className="px-3 py-2 text-white text-[12px] font-[493] hover:bg-white hover:bg-opacity-10 cursor-pointer"
                        >
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
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

interface SortingPanelProps {
    chartType: 'session' | 'date';
    setChartType: (type: 'session' | 'date') => void;
    groupBy: 'Week' | 'Month' | 'All';
    setGroupBy: (groupBy: 'Week' | 'Month' | 'All') => void;
    currentPeriod: string;
    onPeriodChange: (direction: 'prev' | 'next') => void;
    disableForwardNavigation: boolean;
}

export default function SortingPanel({ 
    chartType, 
    setChartType, 
    groupBy, 
    setGroupBy, 
    currentPeriod, 
    onPeriodChange,
    disableForwardNavigation
}: SortingPanelProps) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (groupBy === 'All') return; // No navigation when 'All' is selected

            if (event.key === 'ArrowLeft') {
                onPeriodChange('prev');
            } else if (event.key === 'ArrowRight') {
                onPeriodChange('next');
            } else if (event.key.toLowerCase() === 's') {
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
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [groupBy, onPeriodChange, setChartType, setGroupBy]);

    return (
        <div className="flex w-full p-4 flex-col items-start gap-2 rounded-[14px] bg-black backdrop-blur-[40px]">
            <div className="flex w-full flex-col items-start gap-4">
                <div className="flex justify-between items-center self-stretch">
                    <p className="text-[#D9D9D9] leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[14px] font-normal leading-normal">Group by</p>
                    <Dropdown
                        options={['Week', 'Month', 'All']}
                        value={groupBy}
                        onChange={(value) => setGroupBy(value as 'Week' | 'Month' | 'All')}
                    />
                </div>

                <div className="flex justify-between items-center self-stretch">
                    <p className="text-[#D9D9D9] leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[14px] font-normal leading-normal">Bars show</p>
                    <div className="flex rounded border border-white border-opacity-10 overflow-hidden">
                        <button
                            className={`px-3 py-1 text-[12px] font-[493] ${chartType === 'session' ? 'bg-white text-black' : 'bg-transparent text-white'}`}
                            onClick={() => setChartType('session')}
                        >
                            Session
                        </button>
                        <button
                            className={`px-3 py-1 text-[12px] font-[493] ${chartType === 'date' ? 'bg-white text-black' : 'bg-transparent text-white'}`}
                            onClick={() => setChartType('date')}
                        >
                            Date
                        </button>
                    </div>
                </div>

                {groupBy !== 'All' && (
                    <div className="flex justify-between items-center self-stretch">
                        <ArrowButton orientation="left" onClick={() => onPeriodChange('prev')} />
                        <p className="text-white text-center leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[12px] font-[493] leading-normal">{currentPeriod}</p>
                        {!disableForwardNavigation ? (
                            <ArrowButton orientation="right" onClick={() => onPeriodChange('next')} />
                        ) : (
                            <div className="w-5 h-5" /> // Placeholder to maintain layout
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}