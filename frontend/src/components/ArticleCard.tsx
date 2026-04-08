import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Article } from '../api/client';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const publishedTime = article.published_at
    ? dayjs(article.published_at).format('YYYY-MM-DD HH:mm')
    : '未知时间';

  return (
    <Link to={`/article/${article.id}`} className="block group">
      <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200 hover:border-primary-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                {article.source_name || '未知来源'}
              </span>
              <span className="text-xs text-gray-400">{publishedTime}</span>
            </div>
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
              {article.title}
            </h3>
            {article.summary && (
              <p className="text-sm text-gray-500 line-clamp-2">{article.summary}</p>
            )}
          </div>
          {article.content && (
            <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-gray-100 overflow-hidden">
              <div className="w-full h-full flex items-center justify-center text-3xl">
                📄
              </div>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
