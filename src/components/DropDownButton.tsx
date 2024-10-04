import { useState } from 'react';
import { Arrow } from './Icons';

interface DropdownProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    textSize: 'text-sm' | 'text-md';
}

export default function Dropdown({ options, value, onChange, textSize }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-[143px] p-[4px_8px] justify-between items-center rounded border border-white border-opacity-10 backdrop-blur cursor-pointer"
            >
                <p className={`text-white text-center leading-trim text-edge-cap font-tt-hoves-pro-trial-variable ${textSize} font-[493] leading-normal`}>
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
                            className={`px-3 py-2 text-white ${textSize} font-[493] hover:bg-white hover:bg-opacity-10 cursor-pointer`}
                        >
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}