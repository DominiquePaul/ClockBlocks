import { Arrow } from "./Icons"

function Divider(){
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 212 2" fill="none">
  <path d="M1 1L211 1" stroke="#5E5E5E" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>  
}

function HorizontalLine({ timeString, color }: { timeString: string, color: string }) {
    return (
        <div className="flex items-center gap-4 self-stretch">
            <div className="rounded-full w-full h-1" style={{ background: `linear-gradient(to right, ${color}, #191919)` }} />
            <p className="text-center leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-8px font-normal leading-normal min-w-20" style={{ color: color }}>{timeString}</p>
        </div>
    )
}

function BarGroup({ title, time, color }: { title: string, time: string, color: string }) {
    return (
        <div className="flex justify-between items-center w-full">
            <div className="flex flex-col w-full items-start gap-2 flex-shrink-0">
                <h4 className="text-white leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-10px font-normal leading-normal self-stretch">{title}</h4>
                <HorizontalLine timeString={time} color={color} />
            </div>
            <Arrow orientation="right" />
        </div>
    )
}

export default function ChartSessionPanel({ elements }: { elements: { title: string, time: string, color: string }[] }) {
    return (
        <div className="flex flex-col w-full justify-center items-center self-stretch p-4 px-19 rounded-[14px] bg-black backdrop-blur-[40px]">    
            <div className="flex flex-col w-full items-start gap-8 w-212">
                <div className="flex justify-between items-center self-stretch">
                    <h2 className="text-[#D9D9D9] leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-14px font-normal leading-normal">Categories</h2>
                    <button className="text-[#D9D9D9] leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-10px font-normal leading-normal rounded-[4px_4px_4px_4px] bg-[#191919] backdrop-blur-[0.5px] hover:bg-[#1A1A1A] transition-all duration-300 ease-in-out">Edit Session</button>
                </div>
                    {elements.map((element, index) => (
                        <div key={index} className="flex flex-col items-start gap-2 self-stretch">
                            <BarGroup title={element.title} time={element.time} color={element.color} key={index}/>
                            {index < elements.length - 1 && <Divider />}
                        </div>
                    ))}
            </div>
        </div>
    )
}