import React from 'react';
import { SignalHigh } from 'lucide-react';

interface ConnectionBannerProps {
  statusText?: string;
  badgeText?: string;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  statusText = 'Connection: Poor 2G',
  badgeText = 'Offline ready',
}) => {
  return (
    <div className="bg-[#FFF4EC] border border-[#FCE2D0] rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2">
        <SignalHigh className="w-4 h-4 text-[#DE6C38]" />
        <span className="text-[13px] font-semibold text-[#B85728]">
          {statusText}
        </span>
      </div>
      <span className="text-[11px] font-medium text-[#C8754E]">
        {badgeText}
      </span>
    </div>
  );
};
