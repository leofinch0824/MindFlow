import { useState, useEffect } from 'react';
import { sourcesApi, type NewsSource } from '../api/client';
import dayjs from 'dayjs';

export default function Sources() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
  const [fetchingId, setFetchingId] = useState<number | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">新闻源管理</h2>
        <button
          onClick={() => {
            setEditingSource(null);
            setShowModal(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加新闻源
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <div className="text-5xl mb-4">📡</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无新闻源</h3>
          <p className="text-sm text-gray-500 mb-4">添加你的第一个新闻来源来开始聚合资讯</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            添加新闻源
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <div key={source.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{source.name}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mt-1">
                    {source.source_type === 'mptext' ? '微信公众号' : '自定义'}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-500 mb-4">
                <p>文章数：{source.article_count}</p>
                {source.last_fetch_at && (
                  <p>上次抓取：{dayjs(source.last_fetch_at).format('MM-DD HH:mm')}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFetch(source.id)}
                  disabled={fetchingId === source.id}
                  className="flex-1 inline-flex items-center justify-center px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 disabled:opacity-50 transition-colors"
                >
                  {fetchingId === source.id ? (
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    '抓取'
                  )}
                </button>
                <button
                  onClick={() => handleEdit(source)}
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(source.id)}
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
  const [fakeid, setFakeid] = useState(source?.config?.fakeid || '');
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">认证 Key</label>
            <input
              type="password"
              value={authKey}
              onChange={(e) => setAuthKey(e.target.value)}
              placeholder="MPText API Key（可选）"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
