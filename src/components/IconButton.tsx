import { ReactElement } from "react";

function IconButton({ icon: Icon, onClick, isActive }: { icon: React.ElementType; onClick?: () => void; isActive: boolean }): ReactElement {
  return (
    <button className={`px-2 h-full flex items-center justify-center `} onClick={onClick}>
      <Icon strokeWidth={1} className={`h-[20px] ${isActive ? '' : 'text-gray-400'}`} />
    </button>
  );
}

export default IconButton;