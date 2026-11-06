import React from 'react';
import { ChevronRight, LucideIcon } from 'lucide-react';

interface PrimaryButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'orange' | 'white';
  icon?: LucideIcon;
  showChevron?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  icon: Icon,
  showChevron = true,
  disabled = false,
  isLoading = false,
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'orange':
        return 'bg-[#DE6C38] hover:bg-[#C85A27] text-white shadow-md shadow-orange-950/20 active:bg-[#B34E1F]';
      case 'white':
        return 'bg-white hover:bg-emerald-50 text-[#083830] font-bold shadow-md shadow-black/20 active:bg-gray-100';
      case 'primary':
      default:
        return 'bg-[#0B463B] hover:bg-[#083830] text-white shadow-md shadow-emerald-950/20 active:bg-[#062E27]';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 font-bold text-[14px] tracking-wider transition-all duration-150 transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${getVariantStyles()} ${className}`}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>TRANSMITTING...</span>
        </div>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          <span>{label}</span>
          {showChevron && <ChevronRight className="w-4 h-4 stroke-[2.5]" />}
        </>
      )}
    </button>
  );
};
