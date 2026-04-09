import { useState, useEffect } from 'react';
import { digestsApi, interestsApi, type DailyDigest, type UserInterestTag, type InsightRef } from '../api/newsletter';
import dayjs from 'dayjs';

// Interest sidebar component
function InterestSidebar({
  tags,
  selectedTag,
  onTagSelect
}: {
  tags: UserInterestTag[];
  selectedTag?: string;
  onTagSelect?: (tag: string) => void;
}) {
  return (
    <aside className="w-56 shrink-0">
      <h3 className="font-label text-sm font-semibold text-[#5e5e5e] uppercase tracking-widest mb-4">
        兴趣标签
      </h3>
      <div className="space-y-1">
        {tags.map((tag) => {
          const zone = tag.weight >= 1.3 ? 'main' : tag.weight >= 0.7 ? 'explore' : 'surprise';
          return (
            <button
              key={tag.id}
              onClick={() => onTagSelect?.(tag.tag)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedTag === tag.tag
                  ? 'bg-[#2c5e6e]/10 text-[#0d4656] font-medium'
                  : 'text-[#5e5e5e] hover:bg-[#e8e8e6]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{tag.tag}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  zone === 'main' ? 'bg-[#0d4656] text-white' :
                  zone === 'explore' ? 'bg-amber-100 text-amber-700' :
                  'bg-violet-100 text-violet-700'
                }`}>
                  {tag.weight.toFixed(1)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="h-6 w-32 bg-[#e8e8e6] rounded mb-6" />
          <div className="space-y-6">
            {[1, 2].map((j) => (
              <div key={j} className="pl-6 border-l-2 border-[#c0c8cb] space-y-3">
                <div className="h-5 w-3/4 bg-[#e8e8e6] rounded" />
                <div className="h-4 w-full bg-[#e8e8e6] rounded" />
                <div className="h-4 w-2/3 bg-[#e8e8e6] rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Date selector component
function DateSelector({
  selectedDate,
  onDateChange
}: {
  selectedDate: string;
  onDateChange: (date: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    digestsApi.list({ limit: 30 }).then((res) => {
      setDates(res.items.map((d) => d.date));
    }).catch(() => {});
  }, []);

  const displayDate = selectedDate || dayjs().format('YYYY-MM-DD');
  const formattedDisplay = dayjs(displayDate).format('YYYY年MM月DD日');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#5e5e5e] hover:text-[#1a1c1b] hover:bg-[#e8e8e6] rounded-lg transition-colors"
      >
        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>calendar_today</span>
        <span>{formattedDisplay}</span>
        <span className={`material-symbols-outlined text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>expand_more</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-[#c0c8cb] rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
            <button
              onClick={() => {
                onDateChange(dayjs().format('YYYY-MM-DD'));
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[#e8e8e6]"
            >
              今天
            </button>
            {dates.map((date) => (
              <button
                key={date}
                onClick={() => {
                  onDateChange(date);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#e8e8e6] ${
                  date === selectedDate ? 'text-[#0d4656] font-medium' : ''
                }`}
              >
                {dayjs(date).format('YYYY-MM-DD')}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Main Channel article component
function MainChannelArticle({
  insight,
  badge,
  readTime
}: {
  insight: InsightRef;
  badge: string;
  readTime: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="group relative bg-[#f4f4f2] rounded-xl p-8 lg:p-12 transition-all hover:bg-[#e8e8e6] shadow-[0_12px_40px_rgba(26,28,27,0.03)] border border-[#c0c8cb]/5">
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-[#0d4656]/10 text-[#0d4656] px-3 py-1 text-[10px] uppercase font-bold tracking-widest rounded-full">{badge}</span>
            <span className="text-[#40484b] text-[10px] uppercase tracking-widest">{readTime}</span>
          </div>
          <h4 className="font-headline text-4xl mb-6 leading-tight group-hover:text-[#0d4656] transition-colors">{insight.title}</h4>
          <p className="text-[#40484b] text-lg leading-relaxed mb-8">
            {insight.content}
          </p>
          <div className="mt-8 bg-white/50 p-6 rounded-lg border border-[#c0c8cb]/10">
            <details className="group/dialectical" open={expanded} onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}>
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-label uppercase tracking-widest text-[11px] font-bold text-[#0d4656] flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>psychology</span>
                  Dialectical Analysis
                </span>
                <span className="material-symbols-outlined transition-transform group-open/dialectical:rotate-180" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>expand_more</span>
              </summary>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
                <div>
                  <p className="font-bold mb-2 text-[#0d4656] uppercase text-[10px] tracking-widest">Thesis (Pros)</p>
                  <p className="text-[#40484b]">{insight.dialectical_analysis || 'Insightful analysis pending.'}</p>
                </div>
                <div>
                  <p className="font-bold mb-2 text-[#ba1a1a] uppercase text-[10px] tracking-widest">Antithesis (Cons)</p>
                  <p className="text-[#40484b]">Considerations and counterpoints to explore further.</p>
                </div>
                <div>
                  <p className="font-bold mb-2 text-[#784f28] uppercase text-[10px] tracking-widest">Synthesis (Extensions)</p>
                  <p className="text-[#40484b]">Broader implications and interconnected possibilities.</p>
                </div>
              </div>
            </details>
          </div>
        </div>
        <div className="lg:w-1/3">
          <div className="bg-[#e8e8e6] border-2 border-dashed rounded w-full h-80 flex items-center justify-center">
            <span className="text-[#5e5e5e] text-sm">{insight.source_name}</span>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-4">
              <button className="flex items-center gap-1 text-[#40484b] hover:text-[#0d4656] transition-colors">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>thumb_up</span>
              </button>
              <button className="flex items-center gap-1 text-[#40484b] hover:text-[#0d4656] transition-colors">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>thumb_down</span>
              </button>
            </div>
            <a className="text-[10px] uppercase font-bold tracking-widest text-[#5e5e5e] hover:text-[#0d4656] transition-colors flex items-center gap-1 border-b border-[#5e5e5e]/20 hover:border-[#0d4656]/40 pb-1" href={insight.source_article_link} target="_blank" rel="noopener noreferrer">
              Read Source <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>arrow_outward</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

// Exploration Zone card
function ExplorationCard({
  category,
  title,
  content,
  meta
}: {
  category: 'Emerging Match' | 'Tangent' | 'Speculative';
  title: string;
  content: string;
  meta: string;
}) {
  const categoryStyles = {
    'Emerging Match': 'bg-[#ffdcc0] text-[#784f28]',
    'Tangent': 'bg-[#f3bb8b] text-[#5d3813]',
    'Speculative': 'bg-[#e4e2e2] text-[#5e5e5e]'
  };

  return (
    <div className="bg-[#f4f4f2] p-6 rounded border border-[#c0c8cb]/10 hover:translate-y-[-4px] transition-transform">
      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full mb-4 inline-block ${categoryStyles[category]}`}>{category}</span>
      <h5 className="font-headline text-xl mb-3">{title}</h5>
      <p className="text-sm text-[#40484b] mb-6 line-clamp-3">{content}</p>
      <div className="flex justify-between items-center mt-auto">
        <span className="text-[10px] uppercase tracking-widest text-[#5e5e5e]">{meta}</span>
        <button className="material-symbols-outlined text-[#5e5e5e] hover:text-[#0d4656]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>add_circle</button>
      </div>
    </div>
  );
}

// Surprise Box item
function SurpriseItem({
  number,
  title
}: {
  number: number;
  title: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-md p-6 rounded border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
      <h6 className="font-headline text-lg mb-2">{title}</h6>
      <p className="text-xs opacity-70 mb-4 uppercase tracking-widest">Serendipity #{String(number).padStart(2, '0')}</p>
      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>arrow_forward</span>
    </div>
  );
}

export default function Newsletter() {
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [tags, setTags] = useState<UserInterestTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState<string | undefined>();

  useEffect(() => {
    Promise.all([
      interestsApi.listTags().catch(() => []),
    ]).then(([tagsData]) => {
      setTags(tagsData);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedDate) {
      digestsApi.getByDate(selectedDate).then(setDigest).catch(() => setDigest(null));
    } else {
      digestsApi.latest().then(setDigest).catch(() => setDigest(null));
    }
  }, [selectedDate]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  // Filter insights by selected tag
  const filteredSections = digest?.sections.map((section) => ({
    ...section,
    insights: selectedTag
      ? section.insights.filter((insight) => insight.tags.includes(selectedTag))
      : section.insights,
  })).filter((section) => section.insights.length > 0) || [];

  if (loading) {
    return (
      <div className="flex gap-12">
        <main className="flex-1">
          <div className="mb-10">
            <div className="h-8 w-64 bg-[#e8e8e6] rounded mb-2" />
            <div className="h-4 w-96 bg-[#e8e8e6] rounded" />
          </div>
          <LoadingSkeleton />
        </main>
        <InterestSidebar tags={[]} />
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="text-center py-16">
        <p className="text-[#5e5e5e] text-lg mb-4">
          暂无简报数据
        </p>
        <p className="text-[#5e5e5e] text-sm">
          后端运行中，将在每日9:00自动生成
        </p>
      </div>
    );
  }

  const formattedDate = dayjs(digest.date).format('dddd, MMMM Do, YYYY');

  return (
    <div className="flex gap-12">
      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <header className="mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#c0c8cb]/15 pb-8">
            <div>
              <p className="font-label uppercase tracking-[0.2em] text-xs text-[#5e5e5e] mb-4">{formattedDate}</p>
              <h2 className="font-headline text-6xl md:text-8xl tracking-tight leading-none mb-6">The Morning <br/><span className="italic text-[#0d4656]">Briefing</span></h2>
              <p className="max-w-xl text-lg text-[#40484b] leading-relaxed">
                {digest.overview || 'Your digital atelier has synthesized sources into core insights.'}
              </p>
              <div className="flex items-center gap-4 mt-4 text-xs text-[#5e5e5e]">
                <span>{digest.total_articles_processed} articles processed</span>
                <span>·</span>
                <span>{digest.anchor_count} anchors</span>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-[#f4f4f2] p-2 rounded-full px-6 py-3 border border-[#c0c8cb]/10">
              <button className="material-symbols-outlined text-[#5e5e5e] hover:text-[#0d4656] transition-colors" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>chevron_left</button>
              <span className="font-bold text-sm tracking-widest uppercase">{dayjs(digest.date).format('MMM D')}</span>
              <button className="material-symbols-outlined text-[#5e5e5e] hover:text-[#0d4656] transition-colors" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>chevron_right</button>
              <DateSelector selectedDate={selectedDate || digest.date} onDateChange={handleDateChange} />
            </div>
          </div>
        </header>

        {/* Main Channel */}
        {filteredSections.length > 0 ? (
          <section className="mb-24">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-1 h-8 bg-[#0d4656]"></div>
              <h3 className="font-headline text-3xl italic">Main Channel</h3>
            </div>
            <div className="grid grid-cols-1 gap-16">
              {filteredSections[0]?.insights.slice(0, 2).map((insight, idx) => (
                <MainChannelArticle
                  key={insight.anchor_id}
                  insight={insight}
                  badge={idx === 0 ? 'Core Insight' : 'Societal Shift'}
                  readTime={`${8 + idx * 4} min read`}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Exploration Zone */}
        {filteredSections.length > 1 && (
          <section className="mb-24">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#5e5e5e]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>explore</span>
                <h3 className="font-headline text-3xl italic">Exploration Zone</h3>
              </div>
              <button className="text-[10px] uppercase font-bold tracking-widest text-[#5e5e5e] hover:text-[#0d4656] transition-colors border-b border-[#5e5e5e]/20 pb-1">View All Matches</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredSections.slice(1, 3).map((section, sIdx) =>
                section.insights.slice(0, 2).map((insight, iIdx) => (
                  <ExplorationCard
                    key={insight.anchor_id}
                    category={['Emerging Match', 'Tangent', 'Speculative'][(sIdx * 2 + iIdx) % 3] as 'Emerging Match' | 'Tangent' | 'Speculative'}
                    title={insight.title}
                    content={insight.content}
                    meta={`${section.domain} · ${5 + iIdx * 2}m read`}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* Surprise Box */}
        <section className="mb-32">
          <div className="bg-[#784f28] text-white p-12 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#5d3813] opacity-10 rounded-full translate-x-32 translate-y-[-32px]"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <span className="material-symbols-outlined text-[#fcc493]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>auto_fix_high</span>
                <h3 className="font-headline text-3xl italic">Surprise Box</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SurpriseItem number={1} title="Ikigai in the Age of AI" />
                <SurpriseItem number={2} title="The Aesthetics of Brutalism" />
                <SurpriseItem number={3} title="Music Theory in Fractals" />
                <SurpriseItem number={4} title="Ancient Fermentation Rituals" />
              </div>
              <div className="mt-12 text-center">
                <p className="font-label uppercase tracking-[0.3em] text-[10px] opacity-60">Randomly selected from non-matched interests</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-32 pb-16 border-t border-[#c0c8cb]/10 pt-16 flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="max-w-sm">
            <h2 className="font-headline text-2xl italic mb-4 text-[#0d4656]">MindFlow</h2>
            <p className="text-sm text-[#40484b] leading-relaxed">A digital atelier for the discerning mind. Synthesizing complexity into clarity, one morning at a time.</p>
          </div>
          <div className="flex gap-16">
            <div>
              <h6 className="font-label uppercase tracking-widest text-[11px] font-bold mb-4">Navigation</h6>
              <ul className="text-sm space-y-2 text-[#40484b]">
                <li><a className="hover:text-[#0d4656] transition-colors" href="#">Briefing</a></li>
                <li><a className="hover:text-[#0d4656] transition-colors" href="#">Interests</a></li>
                <li><a className="hover:text-[#0d4656] transition-colors" href="#">Library</a></li>
                <li><a className="hover:text-[#0d4656] transition-colors" href="#">Sources</a></li>
              </ul>
            </div>
            <div>
              <h6 className="font-label uppercase tracking-widest text-[11px] font-bold mb-4">Philosophy</h6>
              <ul className="text-sm space-y-2 text-[#40484b]">
                <li><a className="hover:text-[#0d4656] transition-colors" href="#">How it Works</a></li>
                <li><a className="hover:text-[#0d4656] transition-colors" href="#">Ethics of Synthesis</a></li>
                <li><a className="hover:text-[#0d4656] transition-colors" href="#">Data Privacy</a></li>
              </ul>
            </div>
          </div>
        </footer>
      </main>

      {/* Sidebar */}
      <InterestSidebar
        tags={tags}
        selectedTag={selectedTag}
        onTagSelect={setSelectedTag}
      />
    </div>
  );
}
