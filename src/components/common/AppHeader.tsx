import React from 'react';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useTelemedicine } from '../../state/telemedicineContext';
import { ScreenId } from '../../types/telemedicine';

interface AppHeaderProps {
  title: string;
  onBack?: () => void;
  backTarget?: ScreenId;
  stepIndicator?: string;
  showMenu?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  onBack,
  backTarget,
  stepIndicator,
  showMenu = false,
}) => {
  const { setCurrentScreen } = useTelemedicine();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backTarget) {
      setCurrentScreen(backTarget);
    }
  };

  return (
    <header className="bg-[#0B463B] text-white px-5 pt-3 pb-4 flex items-center justify-between shadow-sm relative z-20">
      <div className="w-8 flex items-center">
        {(onBack || backTarget) ? (
          <button
            onClick={handleBack}
            className="p-1 -ml-1 text-white hover:text-emerald-200 transition-colors rounded-full active:bg-emerald-900/40"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
        ) : (
          <div className="w-5" />
        )}
      </div>

      <h1 className="text-[19px] font-bold tracking-tight text-white text-center flex-1">
        {title}
      </h1>

      <div className="w-8 flex justify-end items-center">
        {stepIndicator && (
          <span className="text-xs font-semibold text-emerald-200/90 tracking-wide">
            {stepIndicator}
          </span>
        )}
        {showMenu && (
          <button
            className="text-white hover:text-emerald-200 transition-colors p-1"
            aria-label="More options"
          >
            <MoreHorizontal className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}
      </div>
    </header>
  );
};
