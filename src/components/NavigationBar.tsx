import IconButton from './IconButton';
import { Timer, ChartColumn, Settings } from "lucide-react";

export default function NavigationBar({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
    return (
      <div className="flex flex-row justify-center items-center h-[30px] mx-auto rounded-2xl w-fit bg-[#D9D9D9]">
        <IconButton icon={Timer} onClick={() => setActivePage('timer')} isActive={activePage === 'timer'} />
        <IconButton icon={ChartColumn} onClick={() => setActivePage('chart')} isActive={activePage === 'chart'} />
        <IconButton icon={Settings} onClick={() => setActivePage('settings')} isActive={activePage === 'settings'} />
      </div>
    );
  }