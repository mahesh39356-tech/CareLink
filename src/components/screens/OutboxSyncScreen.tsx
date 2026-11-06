import React from 'react';
import { Clock, Cloud, Lock } from 'lucide-react';
import { AppHeader } from '../common/AppHeader';
import { PrimaryButton } from '../common/PrimaryButton';
import { useTelemedicine } from '../../state/telemedicineContext';

export const OutboxSyncScreen: React.FC = () => {
  const { outboxRecords, syncOutbox, isSyncing } = useTelemedicine();

  const totalPayload = outboxRecords
    .reduce((acc, curr) => acc + (curr.totalPayloadKb || 8.0), 0)
    .toFixed(1);

  // Avatar background colors matching Figma's natural palette
  const getAvatarBg = (index: number) => {
    switch (index % 3) {
      case 0:
        return 'bg-[#D2EDE7] text-[#0B463B]'; // mint
      case 1:
        return 'bg-[#D9E2EC] text-[#243B53]'; // slate blue
      case 2:
      default:
        return 'bg-[#F0E6D8] text-[#634832]'; // warm beige
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#F7F9F9]">
      <div>
        <AppHeader
          title="Outbox (Offline Sync)"
          backTarget="media"
          showMenu={true}
        />

        <div className="px-5 pt-4 pb-2 space-y-4">
          {/* Section Heading & Total Badge */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-[#0B463B] uppercase">
                OFFLINE SYNC
              </span>
              <h2 className="text-[25px] font-extrabold text-[#0B2E27] tracking-tight leading-tight mt-0.5">
                {outboxRecords.length} records waiting
              </h2>
            </div>

            <span className="bg-[#D8F0EA] text-[#0B463B] text-[12px] font-bold px-3 py-1.5 rounded-xl shadow-xs">
              {totalPayload} KB total
            </span>
          </div>

          {/* Encryption Notice Card */}
          <div className="bg-white rounded-2xl p-3.5 border-l-4 border-l-[#DE6C38] border border-[#E9EFEF] shadow-xs flex items-center gap-3">
            <Lock className="w-4 h-4 text-[#DE6C38] shrink-0" />
            <p className="text-[12px] text-[#4A5D5A] leading-snug">
              Records are safely encrypted on this device and will remain here until transmission completes.
            </p>
          </div>

          {/* Queued Records Cards */}
          <div className="space-y-3">
            {outboxRecords.map((record, idx) => (
              <div
                key={record.id || idx}
                className="bg-white rounded-2xl p-4 border border-[#E9EFEF] shadow-card flex items-center justify-between"
              >
                {/* Avatar + Patient details */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${getAvatarBg(
                        idx
                      )}`}
                    >
                      {record.initials || 'PT'}
                    </div>
                    {/* Badge index counter in orange */}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#DE6C38] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                      {record.badgeIndex || idx + 1}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[15px] font-bold text-[#112622] leading-tight">
                      {record.fullName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#5C736F]">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{record.timestamp || 'Today, 10:42 AM'}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Payload size & Status Pill */}
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[13px] font-extrabold text-[#112622]">
                    {record.totalPayloadKb || '8.2'} KB
                  </span>

                  <div className="inline-flex items-center gap-1.5 bg-[#FFF2EA] border border-[#FCD7C1] text-[#DE6C38] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DE6C38] animate-pulse" />
                    <span>{record.status}</span>
                  </div>
                </div>
              </div>
            ))}

            {outboxRecords.length === 0 && (
              <div className="bg-white rounded-2xl p-6 text-center text-gray-500 border border-dashed border-gray-300">
                Outbox is clean. All records transmitted.
              </div>
            )}
          </div>

          {/* Low Bandwidth Guarantee Card */}
          <div className="bg-[#EEF7F4] rounded-2xl p-3.5 border border-[#D5EFE7] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-100/80 text-[#0B463B] flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#0B463B] leading-tight">
                Optimized for low bandwidth
              </p>
              <p className="text-[11px] text-[#4A645F] mt-0.5">
                All {outboxRecords.length || 3} records use less data than one text message photo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sync CTA Button in Terracotta Orange */}
      <div className="p-5 pb-6">
        <PrimaryButton
          label={`SYNC ALL (${totalPayload} KB)`}
          onClick={syncOutbox}
          variant="orange"
          isLoading={isSyncing}
          disabled={outboxRecords.length === 0}
        />
      </div>
    </div>
  );
};
