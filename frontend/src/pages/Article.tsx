import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import dayjs from 'dayjs';
import { articlesApi, type Article } from '../api/client';

export default function Article() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArticle();
  }, [id]);

  const loadArticle = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await articlesApi.get(Number(id));
      setArticle(data);
    } catch (err) {
      setError('加载文章失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!article || summarizing) return;
    setSummarizing(true);
    try {
      const result = await articlesApi.summarize(article.id);
      setArticle({ ...article, summary: result.summary });
    } catch (err) {
      alert('AI 总结生成失败，请检查 AI 配置');
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">{error || '文章不存在'}</p>
        <Link to="/" className="text-primary-600 hover:underline mt-4 inline-block">
          返回资讯流
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-primary-600 mb-6">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回资讯流
      </Link>

      <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <header className="mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
              {article.source_name || article.author || '未知来源'}
            </span>
            {article.published_at && (
              <span className="text-xs text-gray-400">
                {dayjs(article.published_at).format('YYYY-MM-DD HH:mm')}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>
          {article.summary && (
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-primary-600 text-sm font-medium">AI 总结：</span>
                <p className="text-sm text-primary-800">{article.summary}</p>
              </div>
            </div>
          )}
          {!article.summary && (
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {summarizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  生成中...
                </>
              ) : (
                '✨ AI 总结'
              )}
            </button>
          )}
        </header>

        {article.content ? (
          <div className="markdown-content prose prose-gray max-w-none">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">暂无文章内容</p>
        )}

        {article.link && (
          <footer className="mt-8 pt-6 border-t border-gray-100">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 hover:underline"
            >
              查看原文
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </footer>
        )}
      </article>
    </div>
  );
}
