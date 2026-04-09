import { useEffect } from 'react';
import { useBehaviorCollector } from '../hooks/useBehaviorCollector';
import type { InsightRef } from '../api/newsletter';

interface InsightCardProps {
  insight: InsightRef;
  onTagClick?: (tag: string) => void;
  digestId: number;
}

export function InsightCard({ insight, onTagClick, digestId }: InsightCardProps) {
  const { recordShow, recordClick } = useBehaviorCollector({
    digestId,
    anchorId: insight.anchor_id,
    tag: insight.tags[0] || 'general',
    enabled: true,
  });

  // Report show on mount
  useEffect(() => {
    recordShow();
  }, [recordShow]);

  const handleClick = () => {
    recordClick();
  };

  return (
    <article
      className="group relative bg-[#f4f4f2] rounded-xl p-8 lg:p-12 transition-all hover:bg-[#e8e8e6] shadow-[0_12px_40px_rgba(26,28,27,0.03)] border border-[#c0c8cb]/5"
      onClick={handleClick}
    >
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-6">
            <ZoneBadge zone={insight.zone} />
            <span className="text-[#40484b] text-[10px] uppercase tracking-widest">
              {insight.content.length > 200 ? '8 min read' : '5 min read'}
            </span>
          </div>

          <h3 className="font-serif text-4xl mb-6 leading-tight group-hover:text-[#0d4656] transition-colors text-[#1a1c1b]">
            {insight.title}
          </h3>

          <p className="text-[#40484b] text-lg leading-relaxed mb-8">
            {insight.content.length > 200 ? `${insight.content.slice(0, 200)}...` : insight.content}
          </p>

          {insight.dialectical_analysis && (
            <div className="bg-white/50 p-6 rounded-lg border border-[#c0c8cb]/10">
              <details className="group/dialectical">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="uppercase tracking-widest text-[11px] font-bold text-[#0d4656] flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                      psychology
                    </span>
                    Dialectical Analysis
                  </span>
                  <span className="material-symbols-outlined transition-transform group-open/dialectical:rotate-180" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                    expand_more
                  </span>
                </summary>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
                  <div>
                    <p className="font-bold mb-2 text-[#0d4656] uppercase text-[10px] tracking-widest">Thesis (Pros)</p>
                    <p className="text-[#40484b]">{insight.dialectical_analysis}</p>
                  </div>
                  <div>
                    <p className="font-bold mb-2 text-[#ba1a1a] uppercase text-[10px] tracking-widest">Antithesis (Cons)</p>
                    <p className="text-[#40484b]">Consider counterarguments and potential drawbacks.</p>
                  </div>
                  <div>
                    <p className="font-bold mb-2 text-[#5d3813] uppercase text-[10px] tracking-widest">Synthesis</p>
                    <p className="text-[#40484b]">Integration of opposing views into a coherent whole.</p>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-6">
            {insight.tags.map((tag) => (
              <button
                key={tag}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(tag);
                }}
                className="text-[10px] px-3 py-1 bg-[#0d4656]/10 text-[#0d4656] uppercase font-bold tracking-widest rounded-full hover:bg-[#0d4656]/20 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#c0c8cb]/10">
            <div className="flex gap-4">
              <button className="flex items-center gap-1 text-[#40484b] hover:text-[#0d4656] transition-colors">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                  thumb_up
                </span>
              </button>
              <button className="flex items-center gap-1 text-[#40484b] hover:text-[#0d4656] transition-colors">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                  thumb_down
                </span>
              </button>
            </div>
            <a
              href={insight.source_article_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase font-bold tracking-widest text-[#5e5e5e] hover:text-[#0d4656] transition-colors flex items-center gap-1 border-b border-[#5e5e5e]/20 hover:border-[#0d4656]/40 pb-1"
              onClick={(e) => e.stopPropagation()}
            >
              Read Source
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                arrow_outward
              </span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function ZoneBadge({ zone }: { zone: string }) {
  const styles = {
    main: 'bg-[#0d4656]/10 text-[#0d4656]',
    explore: 'bg-[#ffdcc0] text-[#5d3813]',
    surprise: 'bg-[#e4e2e2] text-[#5e5e5e]',
  };
  const labels = { main: 'Core Insight', explore: 'Exploration', surprise: 'Surprise' };
  return (
    <span className={`inline-block px-3 py-1 text-[10px] uppercase font-bold tracking-widest rounded-full ${styles[zone as keyof typeof styles] || styles.explore}`}>
      {labels[zone as keyof typeof labels] || zone}
    </span>
  );
}
