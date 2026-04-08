import { useState, useEffect } from 'react';
import ArticleCard from '../components/ArticleCard';
import SourceFilter from '../components/SourceFilter';
import SearchBar from '../components/SearchBar';
import { articlesApi, sourcesApi, type Article, type NewsSource } from '../api/client';

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedSourceId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [articlesRes, sourcesRes] = await Promise.all([
        articlesApi.list({ source_id: selectedSourceId ?? undefined, limit: 50 }),
        sourcesApi.list(),
      ]);
      setArticles(articlesRes.items);
      setSources(sourcesRes);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">资讯流</h2>
        <div className="w-full sm:w-80">
          <SearchBar onSearch={setSearchQuery} placeholder="搜索文章标题..." />
        </div>
      </div>

      <SourceFilter
        sources={sources}
        selectedSourceId={selectedSourceId}
        onSelect={setSelectedSourceId}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">加载中...</p>
          </div>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无文章</h3>
          <p className="text-sm text-gray-500">
            {sources.length === 0
              ? '请先在「新闻源」页面添加要订阅的来源'
              : '尝试切换新闻源筛选或稍后再来看看'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
