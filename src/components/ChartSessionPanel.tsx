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
                width: `calc((100% - 50px) * ${barLength})`,
                minWidth: '4px',
                background: color 
            }} />
            <p className="text-left leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-sm font-normal leading-normal w-[50px] ml-2 pl-1 flex-shrink-0" style={{ color: color }}>{timeString}</p>
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
        </div>
    )
}

export default function ChartSessionPanel({ elements, isModalOpen, setIsModalOpen }: { 
    elements: { barData: { title: string, time: number, color: string }[], sessionId: string, sessionStart: string, sessionNumber: string, title: string }, 
    isModalOpen: boolean, 
    setIsModalOpen: (open: boolean) => void 
}) {
    const maxBarLength = Math.max(...elements.barData.map(element => element.time));
    const totalTime = elements.barData.reduce((total, element) => total + element.time, 0);
    return (
        <>
            <div className="flex flex-col w-full h-full justify-start self-stretch p-4 rounded-[14px] bg-black backdrop-blur-[40px] overflow-auto">    
                <div className="flex h-[24px] justify-between w-full items-start pb-2">
                    <p className="text-[rgba(217,217,217,0.30)] leading-trim text-edge-cap font-inter text-sm font-normal leading-normal">{elements.title}</p>
                    {elements.sessionId && <SecondaryButton text="Edit Session" onClick={() => setIsModalOpen(true)}/>}
                </div>
                {totalTime > 0 && <p className="text-white leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[24px] leading-normal pb-4">{`Total: ${formatSeconds(totalTime)}`}</p>}
                {elements.barData.map((element, index) => (
                    <div key={index} className="flex flex-col items-start gap-1 self-stretch">
                        <BarGroup 
                            title={element.title} 
                            timeString={formatSeconds(element.time)} 
                            barLength={element.time/maxBarLength} 
                            color={element.color} // Use the color passed from ChartPage
                        />
                        {index < elements.barData.length - 1 && <Divider />}
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="z-10">
                        <EditModal onClose={() => setIsModalOpen(false)} sessionId={elements.sessionId} sessionStart={elements.sessionStart} sessionNumber={elements.sessionNumber} />
                    </div>
                </div>
            )}
        </>
    )
}