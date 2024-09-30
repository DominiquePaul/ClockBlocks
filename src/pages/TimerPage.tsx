import Box from '../components/Box';
import { TimeBox } from "../lib/types";

function TimerPage({ boxes, handleTimeBoxClick, formatTime }: {
  boxes: TimeBox[];
  handleTimeBoxClick: (id: string) => void;
  formatTime: (seconds: number) => string;
}) {
  const getGridClass = (length: number) => {
    if (length <= 1) return 'grid-cols-1';
    if (length <= 2) return 'grid-cols-1 sm:grid-cols-2';
    if (length <= 3) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    if (length <= 4) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    if (length <= 6) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    if (length <= 8) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  };

  const gridClass = getGridClass(boxes.length);

  return (
    <div className={`grid ${gridClass} gap-4  w-full max-w-[1200px] mx-auto`}>
      {boxes.map(box => (
        <div key={box.id} className="flex justify-center">
          <Box
            name={box.name}
            seconds={formatTime(box.seconds)}
            isActive={box.isActive}
            onClick={() => handleTimeBoxClick(box.id)}
          />
        </div>
      ))}
    </div>
  );
}

export default TimerPage;

// Add this CSS to your global styles or a separate CSS file
const styles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
`;

// Add this style tag to your component or to the head of your HTML document
const styleTag = document.createElement('style');
styleTag.textContent = styles;
document.head.appendChild(styleTag);