import RoundedBox from './RoundedBox';
import PrimaryButton from './PrimaryButton';

export default function NavigationBar({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
    return (
      <RoundedBox roundedCorners="bottom" className="inline-flex justify-center items-center p-2 gap-4 rounded-t-xl backdrop-blur-[33px] bg-[#232323]">
        <div className="inline-flex justify-center items-center gap-3">
          <PrimaryButton isActive={activePage === 'timer'} onClick={() => setActivePage('timer')} isClickable={true}>
              Time
          </PrimaryButton>
          <PrimaryButton isActive={activePage === 'chart'} onClick={() => setActivePage('chart')} isClickable={true}>
              Stats
          </PrimaryButton>
          <PrimaryButton isActive={activePage === 'settings'} onClick={() => setActivePage('settings')} isClickable={true}>
              Settings
          </PrimaryButton>
        </div>
      </RoundedBox>
    );
}