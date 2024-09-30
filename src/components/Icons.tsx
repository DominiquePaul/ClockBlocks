export function Arrow({ orientation }: { orientation: 'left' | 'right' | 'up' | 'down' }) {
    const angle: number = orientation === 'left' ? 180 : orientation === 'right' ? 0 : orientation === 'up' ? 170 : 90
    return (
        <div className={`flex items-center gap-1`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="6" height="9" viewBox="0 0 6 9" fill="none" className={`stroke-white stroke-0.25`} style={{ transform: `rotate(${angle}deg)` }}>
        <path d="M1.19373 8.27917L4.80627 4.66663L1.19373 1.05408" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        </div>
    )
}