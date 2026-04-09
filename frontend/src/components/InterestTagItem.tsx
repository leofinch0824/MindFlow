import type { UserInterestTag } from '../api/newsletter';

interface InterestTagItemProps {
  tag: UserInterestTag;
  onStatusChange: (id: number, status: 'active' | 'frozen') => void;
  onDelete: (id: number) => void;
}

export function InterestTagItem({ tag, onStatusChange, onDelete }: InterestTagItemProps) {
  const zone =
    tag.weight >= 1.3 ? 'main' : tag.weight >= 0.7 ? 'explore' : 'surprise';

  const zoneConfig = {
    main: { label: 'Main Channel', bg: 'bg-[#0d4656]/10 text-[#0d4656]' },
    explore: { label: 'Background', bg: 'bg-[#ffdcc0] text-[#5d3813]' },
    surprise: { label: 'Frozen', bg: 'bg-[#e4e2e2] text-[#5e5e5e]' },
  };

  const config = zoneConfig[zone as keyof typeof zoneConfig];

  // Calculate strength percentage (normalized from weight, max ~2.5)
  const strengthPercent = Math.min(100, (tag.weight / 2.5) * 100);

  return (
    <div className="group p-4 rounded-lg bg-[#f4f4f2] hover:bg-[#e8e8e6] transition-colors border-l-4 border-transparent hover:border-l-[#0d4656]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="font-bold text-sm text-[#1a1c1b] truncate">{tag.tag}</h4>
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${config.bg}`}>
              {config.label}
            </span>
            {tag.status === 'frozen' && (
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-[#e4e2e2] text-[#5e5e5e] italic uppercase tracking-wider font-bold">
                Frozen
              </span>
            )}
          </div>

          {/* Strength progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] text-[#5e5e5e] uppercase tracking-tighter mb-1">
              <span>Strength</span>
              <span className="font-mono">{strengthPercent.toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-[#e2e3e1] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0d4656] rounded-full transition-all"
                style={{ width: `${strengthPercent}%` }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-[10px] text-[#5e5e5e]">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                visibility
              </span>
              <span>{tag.show_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                handyman
              </span>
              <span>{tag.click_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                schedule
              </span>
              <span>
                {tag.total_time_spent > 60
                  ? `${(tag.total_time_spent / 60).toFixed(1)}m`
                  : `${tag.total_time_spent.toFixed(0)}s`}
              </span>
            </div>
          </div>
        </div>

        {/* Hover action buttons */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onStatusChange(tag.id, tag.status === 'frozen' ? 'active' : 'frozen')}
            className="p-1.5 text-[#5e5e5e] hover:text-[#5d3813] hover:bg-[#ffdcc0]/30 rounded transition-colors"
            title={tag.status === 'frozen' ? 'Thaw' : 'Freeze'}
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
              ac_unit
            </span>
          </button>
          <button
            onClick={() => onDelete(tag.id)}
            className="p-1.5 text-[#5e5e5e] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded transition-colors"
            title="Delete"
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
              delete
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
