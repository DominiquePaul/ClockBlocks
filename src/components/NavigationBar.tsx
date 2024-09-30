import RoundedBox from './RoundedBox';
import PrimaryButton from './PrimaryButton';

export default function NavigationBar({ activePage, setActivePage }: { activePage: string; setActivePage: (page: string) => void }) {
    return (
      <RoundedBox roundedCorners="bottom" className="inline-flex justify-center items-center p-2 gap-4 rounded-t-xl backdrop-blur-[33px] bg-[#232323]">
        <div className="inline-flex justify-center items-center gap-3">
          <PrimaryButton isActive={activePage === 'timer'} onClick={() => setActivePage('timer')}>
              Time
          </PrimaryButton>
          <PrimaryButton isActive={activePage === 'chart'} onClick={() => setActivePage('chart')}>
              Charts
          </PrimaryButton>
          <PrimaryButton isActive={activePage === 'settings'} onClick={() => setActivePage('settings')}>
              Settings
          </PrimaryButton>
        </div>
      </RoundedBox>
    );
}