export default function SecondaryButton({ onClick, text }: { onClick: () => void, text: string }) {
    return (
            <button onClick={onClick} className="flex h-[20px] p-3 items-center bg-[#191919] border-none rounded-sm backdrop-blur-[0.5px] no-underline">
                <p className="text-[#D9D9D9] leading-trim text-edge-cap  text-sm font-normal leading-normal">{text}</p>
            </button>
    );
}