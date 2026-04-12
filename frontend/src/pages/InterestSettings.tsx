import { useState, useEffect } from 'react';
import { interestsApi, type UserInterestTag, type TagCandidate } from '../api/newsletter';

export default function InterestSettings() {
  const [tags, setTags] = useState<UserInterestTag[]>([]);
  const [candidates, setCandidates] = useState<TagCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tagsData, , candidatesData] = await Promise.all([
        interestsApi.listTags().catch(() => []),
        interestsApi.getStats().catch(() => null),
        interestsApi.getCandidates(5).catch(() => []),
      ]);
      setTags(tagsData);
      setCandidates(candidatesData);
    } catch (err) {
      console.error('Failed to load interest data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim()) return;
    setAdding(true);
    try {
      await interestsApi.createTag(tagName.trim());
      setNewTag('');
      loadData();
    } catch (err) {
      console.error('Failed to add tag:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleAddCandidate = async (tagName: string) => {
    await handleAddTag(tagName);
  };

  const handleStatusChange = async (id: number, status: 'active' | 'frozen') => {
    try {
      await interestsApi.updateTag(id, { status });
      loadData();
    } catch (err) {
      console.error('Failed to update tag status:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个兴趣标签吗？')) return;
    try {
      await interestsApi.deleteTag(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete tag:', err);
    }
  };

  // Helper to get status label
  const getStatusLabel = (tag: UserInterestTag): string => {
    if (tag.status === 'frozen') return 'Frozen';
    const strength = Math.round((tag.weight / 2.5) * 100);
    if (strength >= 70) return 'Main Channel';
    if (strength >= 30) return 'Daily Priority';
    return 'Background';
  };

  // Helper to get strength percentage
  const getStrengthPercent = (tag: UserInterestTag): number => {
    if (tag.status === 'frozen') return 0;
    return Math.min(100, Math.round((tag.weight / 2.5) * 100));
  };

  // Get top interests for the "Deep Resonance" panel
  const topInterests = [...tags]
    .filter(t => t.status === 'active')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      {/* Hero Header */}
      <div className="mb-16">
        <h2 className="font-serif text-5xl md:text-6xl text-on-surface mb-4">Interest Management</h2>
        <p className="text-secondary font-sans max-w-2xl leading-relaxed">
          Refine the architectural core of your daily digest. Weight your passions, adopt new perspectives, and prune the noise.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Analytics Summary (4 Columns) */}
        <div className="md:col-span-4 bg-surface-container-low p-8 rounded-xl flex flex-col justify-between">
          <div>
            <span className="font-sans text-[11px] uppercase tracking-widest text-secondary">Weekly Focus</span>
            <h3 className="font-serif text-3xl mt-4 mb-8">Deep Resonance</h3>
            <div className="space-y-6">
              {topInterests.length > 0 ? (
                topInterests.map((tag, index) => {
                  const icons = ['psychology', 'eco', 'biotech'];
                  const colors = [
                    'bg-primary-container/10 text-primary',
                    'bg-tertiary-container/10 text-tertiary',
                    'bg-secondary-container/20 text-secondary'
                  ];
                  return (
                    <div key={tag.id} className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${colors[index % 3]} flex items-center justify-center`}>
                        <span className="material-symbols-outlined">{icons[index % 3]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{tag.tag}</p>
                        <p className="text-xs text-secondary">
                          {tag.status === 'frozen' ? 'Frozen' : `Strength: ${getStrengthPercent(tag)}%`}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-secondary text-sm">No active interests yet</p>
              )}
            </div>
          </div>
          <div className="mt-12">
            <img
              className="w-full h-32 object-cover rounded-lg img-grayscale"
              alt="Abstract digital visualization of neural connections"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6xqMZq_WT0WAAL0fPZbCyJSpQzcHO87aIKjw_r1m-Ye15pPrZbjlMmV5mciuh4v8SAvAc2pLL_yX9YSLdsqSummCGsGSFviYBVNCyfGa-O3RWBJlGhLUc2Xdtnao4RIar1-aHTh2ACw3Q34cnEFn9NRWzIaEYilh617oal_c54NEuxq69-TnuCqe0MvIdzXgUscDks1nGUds2sjO4HCncoaQg2IFBUK-9aUAZzoMAXyaJdSy-ERQ8v98YO4yMSF0ABp5-JEKZenpJ"
            />
          </div>
        </div>

        {/* Active Interests Cloud (8 Columns) */}
        <div className="md:col-span-8 space-y-8">
          {/* Add New Interest */}
          <div className="bg-surface-container-lowest border border-outline-variant/10 p-8 rounded-xl">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                id="interest-input"
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag(newTag)}
                placeholder="Enter interest name..."
                className="flex-1 px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={() => handleAddTag(newTag)}
                disabled={adding || !newTag.trim()}
                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                {adding ? 'Adding...' : 'Add Interest'}
              </button>
            </div>
          </div>

          {/* Active Interests Cards */}
          <div className="bg-surface-container-lowest border border-outline-variant/10 p-8 rounded-xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-serif text-2xl">Active Interests</h3>
              <button
                onClick={() => document.getElementById('interest-input')?.focus()}
                className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest hover:underline"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Add Interest
              </button>
            </div>

            {tags.length === 0 ? (
              <div className="text-center py-12 text-secondary">
                <span className="material-symbols-outlined text-4xl mb-4">label_important</span>
                <p>No interests yet</p>
                <p className="text-sm mt-1">Add interests to personalize your digest</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tags.map((tag) => {
                  const isFrozen = tag.status === 'frozen';
                  const strength = getStrengthPercent(tag);
                  const statusLabel = getStatusLabel(tag);

                  return (
                    <div
                      key={tag.id}
                      className={`p-4 rounded-lg bg-surface hover:bg-surface-container-high transition-colors group ${isFrozen ? 'bg-surface-container-highest/50 opacity-60 border border-dashed border-outline-variant' : ''} ${!isFrozen && strength >= 70 ? 'border-l-4 border-primary' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className={`font-bold text-sm ${isFrozen ? 'italic' : ''}`}>{tag.tag}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isFrozen ? (
                            <span
                              className="material-symbols-outlined text-sm cursor-pointer text-primary"
                              onClick={() => handleStatusChange(tag.id, 'active')}
                              title="Thaw"
                            >
                              ac_unit
                            </span>
                          ) : (
                            <>
                              <span
                                className="material-symbols-outlined text-sm cursor-pointer text-secondary hover:text-tertiary"
                                onClick={() => handleStatusChange(tag.id, 'frozen')}
                                title="Freeze"
                              >
                                ac_unit
                              </span>
                              <span
                                className="material-symbols-outlined text-sm cursor-pointer text-secondary hover:text-error"
                                onClick={() => handleDelete(tag.id)}
                                title="Delete"
                              >
                                delete
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isFrozen ? 'bg-secondary' : 'bg-primary'}`}
                          style={{ width: `${strength}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[10px] text-secondary uppercase tracking-tighter">
                          Strength: {strength}%
                        </span>
                        <span className="text-[10px] text-secondary uppercase tracking-tighter">
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* System Suggestions / Emergent Patterns */}
          {candidates.length > 0 && (
            <div className="bg-tertiary-container/5 border border-tertiary/10 p-8 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-6xl">auto_awesome</span>
              </div>
              <h3 className="font-serif text-2xl mb-2 text-tertiary">Emergent Patterns</h3>
              <p className="text-sm text-on-surface-variant mb-6">
                AI detected these recurring themes in your reading history. Should we elevate them?
              </p>
              <div className="flex flex-wrap gap-4">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.tag}
                    className="bg-surface-container-lowest px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{candidate.tag}</span>
                      <span className="text-[10px] text-secondary">
                        出现在 {candidate.count} 篇文章中
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddCandidate(candidate.tag)}
                      className="ml-2 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded"
                    >
                      Adopt
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Control Section */}
      <div className="mt-16 pt-12 border-t border-outline-variant/10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-primary">tune</span>
          <div>
            <h4 className="font-bold text-sm mb-1">Global Weighting</h4>
            <p className="text-xs text-secondary">
              Adjust how aggressive the AI is in finding new topics versus reinforcing existing ones.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-primary">history</span>
          <div>
            <h4 className="font-bold text-sm mb-1">Evolution History</h4>
            <p className="text-xs text-secondary">
              See how your interests have shifted over the last 6 months.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-primary">export_notes</span>
          <div>
            <h4 className="font-bold text-sm mb-1">Data Portability</h4>
            <p className="text-xs text-secondary">
              Download your semantic profile for use in other research tools.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
