import {Arrow} from "./Icons"

function ArrowButton({ orientation }: { orientation: 'left' | 'right' | 'up' | 'down' }) {
    return (
        <button className="flex w-5 h-5 p-1.5 justify-center items-center gap-6.75 rounded border border-white border-opacity-10 backdrop-blur">
            <Arrow orientation={orientation} />
        </button>
    )
}



export default function SortingPanel() {
    return (
        <div className="flex w-full p-4 flex-col items-start gap-2 rounded-[14px] bg-black backdrop-blur-[40px]">
            <div className="flex w-full flex-col items-start gap-8">
                <div className="flex justify-between items-center self-stretch">
                    <p className="text-[#D9D9D9] leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[14px] font-normal  leading-normal">Show by</p>
                    <div className="flex w-[143px] p-[6px_8px] justify-between items-center rounded border border-white border-opacity-10 backdrop-blur">
                        <p className="text-white text-center leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[12px] font-[493] leading-normal">Week</p>
                        <Arrow orientation="down" />
                    </div>
                </div>

                <div className="flex justify-between items-center self-stretch">
                    <ArrowButton orientation="left" />
                    <p className="text-white text-center leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[12px] font-[493] leading-normal">01-07 Sep</p>
                    <ArrowButton orientation="right" />
                    </div>
            </div>
        </div>
    )
}