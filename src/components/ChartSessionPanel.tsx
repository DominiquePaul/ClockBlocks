import { useState } from 'react'
import SecondaryButton from "./SecondaryButton"
import { formatSeconds } from "../lib/utils"
import EditModal from './EditModal'

function Divider(){
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 212 2" fill="none">
  <path d="M1 1L211 1" stroke="#5E5E5E" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>  
}

function HorizontalLine({ timeString, barLength, color }: { timeString: string, barLength: number, color: string }) {
    return (
        <div className="relative w-full h-1 mb-1 flex items-center">
            <div className="h-full rounded-full" style={{ 
                width: `calc(${barLength * 100}% - 50px)`, // Adjust width to account for the space needed for the text
                minWidth: '4px', // Add a minimum width
                background: color 
            }} />
            <p className="text-left leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-sm font-normal leading-normal min-w-[50px] ml-2 pl-1 flex-shrink-0" style={{ color: color }}>{timeString}</p>
        </div>
    )
}

function BarGroup({ title, timeString, barLength, color }: { title: string, timeString: string, barLength: number, color: string }) {
    return (
        <div className="flex justify-between items-center w-full py-2 pl-1">
            <div className="flex flex-col w-full items-start gap-2 flex-grow">
                <h4 className="text-[#dddddd] leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-sm font-normal leading-normal self-stretch">{title}</h4>
                <HorizontalLine barLength={barLength} timeString={timeString} color={color} />
            </div>
            {/* <Arrow orientation="right" /> */}
        </div>
    )
}

export default function ChartSessionPanel({ elements }: { elements: { title: string, time: number, color: string }[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const maxBarLength = Math.max(...elements.map(element => element.time));

    const setOpenModal = (open: boolean) => {
        setIsModalOpen(open)
    }

    return (
        <>
            <div className="flex flex-col w-full h-full justify-start items-center self-stretch p-4 rounded-[14px] bg-black backdrop-blur-[40px] overflow-auto">    
                <div className="flex flex-col w-full items-start gap-1">
                    <div className="flex justify-between items-center self-stretch pb-4">
                        <h2 className="text-white leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-14px font-normal leading-normal">Time Block Split</h2>
                        <SecondaryButton text="Edit Session" onClick={() => setOpenModal(true)} />
                    </div>
                    {elements.map((element, index) => (
                        <div key={index} className="flex flex-col items-start gap-1 self-stretch">
                            <BarGroup title={element.title} timeString={formatSeconds(element.time)} barLength={element.time/maxBarLength} color={element.color} />
                            {index < elements.length - 1 && <Divider />}
                        </div>
                    ))}
                </div>
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setOpenModal(false)}></div>
                    <div className="z-10">
                        <EditModal onClose={() => setOpenModal(false)} />
                    </div>
                </div>
            )}
        </>
    )
}