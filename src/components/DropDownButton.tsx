import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Arrow } from './Icons';

interface Option {
    id: string;
    name: string;
}

interface DropdownProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    textSize: 'text-sm' | 'text-md';
}

export default function Dropdown({ options, value, onChange, textSize }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: '50vh' });
    const triggerRef = useRef<HTMLDivElement | null>(null);

    // Find the selected option based on the value (id)
    const selectedOption = options.find(option => option.id === value);
    const displayValue = selectedOption ? selectedOption.name : 'Select an option';

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            let top = rect.bottom + window.scrollY;
            let maxHeight = '50vh';

            if (spaceBelow < 200 && spaceAbove > spaceBelow) {
                // Not enough space below, position above
                top = rect.top + window.scrollY - 200; // Adjust 200 to the desired dropdown height
                maxHeight = `${spaceAbove}px`;
            } else {
                // Enough space below, position below
                maxHeight = `${spaceBelow}px`;
            }

            setDropdownPosition({
                top,
                left: rect.left + window.scrollX,
                width: rect.width,
                maxHeight
            });
        }
    }, [isOpen]);

    return (
        <div className="relative" ref={triggerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-[143px] p-[4px_8px] justify-between items-center rounded border border-white border-opacity-10 backdrop-blur cursor-pointer"
            >
                <p className={`text-white text-center leading-trim text-edge-cap ${textSize} leading-normal`}>
                    {displayValue} {/* Display the name of the selected option */}
                </p>
                <Arrow orientation={isOpen ? "down" : "right"} />
            </div>
            {isOpen && createPortal(
                <div
                    style={{
                        position: 'absolute',
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                        zIndex: 1000,
                        maxHeight: dropdownPosition.maxHeight,
                        overflowY: 'auto'
                    }}
                    className="mt-1 rounded border border-white border-opacity-10 backdrop-blur bg-black"
                >
                    {options.map((option) => (
                        <div
                            key={option.id}
                            onClick={() => {
                                onChange(option.id);
                                setIsOpen(false);
                            }}
                            className={`px-3 py-2 text-white ${textSize} hover:bg-white hover:bg-opacity-10 cursor-pointer`}
                        >
                            {option.name}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}
