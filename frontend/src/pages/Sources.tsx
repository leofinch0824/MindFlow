import { useState, useEffect } from 'react';
import { sourcesApi, type NewsSource, type ParsedAccount } from '../api/newsletter';
import dayjs from 'dayjs';

export default function Sources() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [quickAddUrl, setQuickAddUrl] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');
  const [parsedAccountForModal, setParsedAccountForModal] = useState<ParsedAccount | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    try {
      const data = await sourcesApi.list();
      setSources(data);
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddUrl.trim()) {
      setQuickAddError('请输入链接');
      return;
    }

    if (!quickAddUrl.includes('mp.weixin.qq.com')) {
      setQuickAddError('请输入有效的微信公众号文章链接');
      return;
    }

    setQuickAddLoading(true);
    setQuickAddError('');

    try {
      const account = await sourcesApi.parseUrl(quickAddUrl);
      setParsedAccountForModal(account);
      setShowUrlModal(true);
      setQuickAddUrl('');
    } catch (err) {
      setQuickAddError(err instanceof Error ? err.message : '解析失败');
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个新闻源吗？')) return;
    try {
      await sourcesApi.delete(id);
      setSources(sources.filter((s) => s.id !== id));
    } catch (err) {
      alert('删除失败');
    }
  };

  const handleFetch = async (id: number) => {
    setFetchingId(id);
    try {
      const result = await sourcesApi.fetch(id);
      alert(result.message);
      loadSources();
    } catch (err) {
      alert('抓取失败');
    } finally {
      setFetchingId(null);
    }
  };

  const handleEdit = (source: NewsSource) => {
    setEditingSource(source);
    setShowModal(true);
  };

  // Calculate stats for bento grid
  const healthyCount = sources.length;
  const criticalCount = sources.filter(s => {
    if (!s.last_fetch_at) return false;
    const lastFetch = dayjs(s.last_fetch_at);
    const hoursAgo = dayjs().diff(lastFetch, 'hours');
    return hoursAgo > 24;
  }).length;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 bg-[#0d4656]"></div>
            <span className="font-['Manrope'] uppercase tracking-widest text-[11px] text-[#5e5e5e]">Information Architecture</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-['Newsreader'] italic leading-tight text-[#1a1c1b]">Source Management</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => sources.forEach(s => handleFetch(s.id))}
            className="flex items-center gap-2 border border-[#c0c8cb]/30 px-5 py-2.5 rounded-lg text-sm font-semibold text-[#1a1c1b] hover:bg-[#f4f4f2] transition-colors"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>sync</span>
            Manual Crawl All
          </button>
          <button
            onClick={() => {
              setEditingSource(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-br from-[#0d4656] to-[#2c5e6e] px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-lg hover:translate-y-[-1px] transition-all"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>add_link</span>
            Add New Source
          </button>
        </div>
      </div>

      {/* Bento Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-[#f4f4f2] p-6 rounded-xl flex flex-col justify-between">
          <span className="font-['Manrope'] uppercase tracking-widest text-[10px] text-[#5e5e5e]">Healthy Links</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-['Newsreader'] italic">{healthyCount}</span>
            <span className="text-xs text-green-600 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>arrow_upward</span>
              Active
            </span>
          </div>
        </div>
        <div className="md:col-span-1 bg-[#f4f4f2] p-6 rounded-xl flex flex-col justify-between">
          <span className="font-['Manrope'] uppercase tracking-widest text-[10px] text-[#5e5e5e]">Latency</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-['Newsreader'] italic">0.8s</span>
            <span className="text-xs text-[#5e5e5e] font-medium">Avg Crawl</span>
          </div>
        </div>
        <div className="md:col-span-2 bg-[#e2e3e1] p-6 rounded-xl flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <span className="font-['Manrope'] uppercase tracking-widest text-[10px] text-[#0d4656]">Critical Issues</span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-['Newsreader'] italic text-[#ba1a1a]">{criticalCount}</span>
              <span className="text-xs text-[#ba1a1a] font-medium">Action required</span>
            </div>
          </div>
          <div className="absolute right-[-10%] bottom-[-20%] opacity-10">
            <span className="material-symbols-outlined text-9xl text-[#0d4656]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>warning</span>
          </div>
        </div>
      </div>

      {/* Sources Table */}
      <div className="bg-[#f4f4f2] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0d4656] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-[#eeeeec] rounded-full flex items-center justify-center mb-6 mx-auto">
              <span className="material-symbols-outlined text-4xl text-[#c0c8cb]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>cloud_off</span>
            </div>
            <h2 className="text-3xl font-['Newsreader'] italic mb-2 text-[#1a1c1b]">No Active Signals</h2>
            <p className="max-w-md text-[#40484b] text-sm leading-relaxed mb-8 mx-auto">
              Your atelier is currently quiet. Connect a source to begin the curation process and receive your first briefing.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#0d4656] text-white px-8 py-3 rounded-lg font-semibold shadow-xl hover:opacity-90 transition-opacity"
            >
              Start Connection
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#e8e8e6]/50 border-b border-[#c0c8cb]/10">
                  <th className="px-8 py-5 font-['Manrope'] uppercase tracking-widest text-[11px] text-[#5e5e5e]">Source Identity</th>
                  <th className="px-6 py-5 font-['Manrope'] uppercase tracking-widest text-[11px] text-[#5e5e5e]">Type</th>
                  <th className="px-6 py-5 font-['Manrope'] uppercase tracking-widest text-[11px] text-[#5e5e5e]">Last Indexed</th>
                  <th className="px-6 py-5 font-['Manrope'] uppercase tracking-widest text-[11px] text-[#5e5e5e]">Status</th>
                  <th className="px-8 py-5 text-right font-['Manrope'] uppercase tracking-widest text-[11px] text-[#5e5e5e]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c0c8cb]/10">
                {sources.map((source) => {
                  const isHealthy = source.last_fetch_at && dayjs().diff(dayjs(source.last_fetch_at), 'hours') < 24;
                  return (
                    <tr key={source.id} className={`hover:bg-[#e2e3e1]/50 transition-colors group ${!isHealthy && source.last_fetch_at ? 'bg-[#ffdad6]/5' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#2c5e6e]">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>newspaper</span>
                          </div>
                          <div>
                            <div className="font-['Newsreader'] text-lg italic text-[#1a1c1b]">{source.name}</div>
                            <div className="text-xs text-[#71787c] font-medium tracking-wide">{source.api_base_url}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="px-3 py-1 bg-[#e2e3e1] text-[#5e5e5e] text-[10px] font-bold uppercase tracking-widest rounded-full">
                          {source.source_type === 'mptext' ? 'WeChat' : 'Custom'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-sm text-[#40484b]">
                        {source.last_fetch_at ? dayjs(source.last_fetch_at).format('MM-DD HH:mm') : 'Never'}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          {isHealthy ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                              <span className="text-[11px] font-bold text-green-700 uppercase tracking-tight">Healthy</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-pulse"></div>
                              <span className="text-[11px] font-bold text-[#ba1a1a] uppercase tracking-tight">Needs Attention</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleFetch(source.id)}
                            disabled={fetchingId === source.id}
                            className="p-2 text-[#71787c] hover:text-[#0d4656] hover:bg-white rounded-lg transition-all"
                            title="Fetch Now"
                          >
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>sync</span>
                          </button>
                          <button
                            onClick={() => handleEdit(source)}
                            className="p-2 text-[#71787c] hover:text-[#0d4656] hover:bg-white rounded-lg transition-all"
                            title="Edit Source"
                          >
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(source.id)}
                            className="p-2 text-[#71787c] hover:text-[#ba1a1a] hover:bg-white rounded-lg transition-all"
                            title="Delete Source"
                          >
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Add Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start border-t border-[#c0c8cb]/20 pt-12">
        <div className="md:col-span-1">
          <h3 className="text-2xl font-['Newsreader'] italic mb-2 text-[#1a1c1b]">Ingest New Signal</h3>
          <p className="text-sm text-[#40484b] leading-relaxed">
            Add a new URL, RSS feed, or social profile to your digital atelier. Our crawlers will analyze the intellectual density before indexing.
          </p>
        </div>
        <div className="md:col-span-2">
          <div className="bg-white p-1 rounded-xl shadow-sm ring-1 ring-[#c0c8cb]/15 flex flex-col sm:flex-row gap-1">
            <input
              type="url"
              value={quickAddUrl}
              onChange={(e) => {
                setQuickAddUrl(e.target.value);
                setQuickAddError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
              placeholder="粘贴微信公众号文章链接"
              className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-sm placeholder:text-[#71787c]/50 text-[#1a1c1b]"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleQuickAdd}
                disabled={quickAddLoading}
                className="bg-[#0d4656] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {quickAddLoading ? '解析中...' : '添加'}
              </button>
            </div>
          </div>
          {quickAddError && (
            <p className="mt-2 text-sm text-red-600">{quickAddError}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-[10px] text-[#71787c] font-['Manrope'] uppercase tracking-wider self-center mr-2">Suggestions:</span>
            <button className="px-3 py-1 bg-[#f4f4f2] border border-[#c0c8cb]/10 rounded-full text-[10px] text-[#5e5e5e] hover:bg-[#e8e8e6] transition-colors">Aeon Magazine</button>
            <button className="px-3 py-1 bg-[#f4f4f2] border border-[#c0c8cb]/10 rounded-full text-[10px] text-[#5e5e5e] hover:bg-[#e8e8e6] transition-colors">The Browser</button>
            <button className="px-3 py-1 bg-[#f4f4f2] border border-[#c0c8cb]/10 rounded-full text-[10px] text-[#5e5e5e] hover:bg-[#e8e8e6] transition-colors">Ribbonfarm</button>
          </div>
        </div>
      </div>

      {showModal && (
        <SourceModal
          source={editingSource}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            loadSources();
          }}
        />
      )}

      {showUrlModal && (
        <AddFromUrlModal
          onClose={() => {
            setShowUrlModal(false);
            setParsedAccountForModal(null);
          }}
          onSuccess={() => {
            setShowUrlModal(false);
            setParsedAccountForModal(null);
            loadSources();
          }}
          initialAccount={parsedAccountForModal}
        />
      )}
    </div>
  );
}

interface SourceModalProps {
  source: NewsSource | null;
  onClose: () => void;
  onSave: () => void;
}

function SourceModal({ source, onClose, onSave }: SourceModalProps) {
  const [name, setName] = useState(source?.name || '');
  const [sourceType, setSourceType] = useState(source?.source_type || 'mptext');
  const [apiBaseUrl, setApiBaseUrl] = useState(source?.api_base_url || 'https://down.mptext.top');
  const [authKey, setAuthKey] = useState(source?.auth_key || '');
  const [fakeid, setFakeid] = useState<string>(source?.config?.fakeid as string || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name,
        source_type: sourceType,
        api_base_url: apiBaseUrl,
        auth_key: authKey,
        config: { fakeid },
      };
      if (source) {
        await sourcesApi.update(source.id, data);
      } else {
        await sourcesApi.create(data);
      }
      onSave();
    } catch (err) {
      alert(source ? '更新失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {source ? '编辑新闻源' : '添加新闻源'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="例如：科技资讯"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d4656]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d4656]"
            >
              <option value="mptext">微信公众号 (MPText)</option>
              <option value="custom">自定义 REST API</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API 基础 URL</label>
            <input
              type="url"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d4656]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">认证 Key</label>
            <input
              type="password"
              value={authKey}
              onChange={(e) => setAuthKey(e.target.value)}
              placeholder="MPText API Key（可选）"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d4656]"
            />
          </div>
          {sourceType === 'mptext' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">微信公众号 Fake ID</label>
              <input
                type="text"
                value={fakeid}
                onChange={(e) => setFakeid(e.target.value)}
                required
                placeholder="在 MPText 平台获取的 fakeid"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d4656]"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0d4656] rounded-lg hover:bg-[#2c5e6e] disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddFromUrlModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialAccount?: ParsedAccount | null;
}

function AddFromUrlModal({ onClose, onSuccess, initialAccount }: AddFromUrlModalProps) {
  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedAccount, setParsedAccount] = useState<ParsedAccount | null>(initialAccount || null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleParse = async () => {
    if (!url.trim()) {
      setError('请输入文章链接');
      return;
    }

    if (!url.includes('mp.weixin.qq.com')) {
      setError('请输入有效的微信公众号文章链接');
      return;
    }

    setParsing(true);
    setError('');
    setParsedAccount(null);

    try {
      const account = await sourcesApi.parseUrl(url);
      setParsedAccount(account);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedAccount) return;

    setSaving(true);
    try {
      await sourcesApi.create({
        name: parsedAccount.nickname,
        source_type: 'mptext',
        api_base_url: 'https://down.mptext.top',
        auth_key: '',
        config: { fakeid: parsedAccount.fakeid },
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">从文章链接添加公众号</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!initialAccount && !parsedAccount && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">微信公众号文章链接</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError('');
                    setParsedAccount(null);
                  }}
                  placeholder="https://mp.weixin.qq.com/s/..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d4656]"
                />
                <button
                  onClick={handleParse}
                  disabled={parsing || !url.trim()}
                  className="px-4 py-2 bg-[#0d4656] text-white rounded-lg text-sm font-medium hover:bg-[#2c5e6e] disabled:opacity-50 transition-colors"
                >
                  {parsing ? '解析中...' : '解析'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">粘贴任意微信公众号文章的链接，系统将自动识别所属公众号</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {(parsedAccount || initialAccount) && (() => {
            const account = parsedAccount || initialAccount!;
            return (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  {account.avatar ? (
                    <img
                      src={account.avatar}
                      alt={account.nickname}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                      📮
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900">{account.nickname}</h4>
                    {account.is_verify === 2 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        已认证
                      </span>
                    )}
                  </div>
                </div>

                {account.alias && (
                  <p className="text-sm text-gray-500 mb-2">微信号：{account.alias}</p>
                )}

                {account.verify_info && (
                  <p className="text-sm text-gray-500 mb-2">主体：{account.verify_info}</p>
                )}

                {account.signature && (
                  <p className="text-sm text-gray-400 line-clamp-2">{account.signature}</p>
                )}

                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-gray-500 mb-1">Fake ID：{account.fakeid}</p>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!parsedAccount || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0d4656] rounded-lg hover:bg-[#2c5e6e] disabled:opacity-50 transition-colors"
          >
            {saving ? '添加中...' : '确认添加'}
          </button>
        </div>
      </div>
    </div>
  );
}
