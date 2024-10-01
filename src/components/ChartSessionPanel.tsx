import { Arrow } from "./Icons"
import PrimaryButton from "./PrimaryButton"

function Divider(){
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 212 2" fill="none">
  <path d="M1 1L211 1" stroke="#5E5E5E" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>  
}

function HorizontalLine({ timeString, color }: { timeString: string, color: string }) {
    return (
        <div className="flex items-end gap-4 self-stretch">
            <div className="rounded-full w-full h-1 mb-1" style={{ background: `linear-gradient(to right, ${color}, #191919)` }} />
            <p className="text-center leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-sm font-normal leading-normal min-w-20" style={{ color: color }}>{timeString}</p>
        </div>
    )
}

function BarGroup({ title, time, color }: { title: string, time: string, color: string }) {
    return (
        <div className="flex justify-between items-center w-full py-1">
            <div className="flex flex-col w-full items-start gap-0 flex-shrink-0">
                <h4 className="text-[#dddddd] leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-sm font-normal leading-normal self-stretch pb-">{title}</h4>
                <HorizontalLine timeString={time} color={color} />
            </div>
            <Arrow orientation="right" />
        </div>
    )
}

export default function ChartSessionPanel({ elements }: { elements: { title: string, time: string, color: string }[] }) {
    return (
        <div className="flex flex-col w-full h-full justify-start items-center self-stretch p-4 rounded-[14px] bg-black backdrop-blur-[40px] overflow-auto">    
            <div className="flex flex-col w-full items-start gap-1">
                <div className="flex justify-between items-center self-stretch pb-4">
                    <h2 className="text-white leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-14px font-normal leading-normal">Time Block Split</h2>
                    <PrimaryButton isActive={true} onClick={() => {}} icon={null}>Edit Session</PrimaryButton>
                </div>
                {elements.map((element, index) => (
                    <div key={index} className="flex flex-col items-start gap-1 self-stretch">
                        <BarGroup title={element.title} time={element.time} color={element.color} />
                        {index < elements.length - 1 && <Divider />}
                    </div>
                ))}
            </div>
        </div>
    )
}