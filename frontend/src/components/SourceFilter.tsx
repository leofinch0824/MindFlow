import type { NewsSource } from '../api/client';

interface SourceFilterProps {
  sources: NewsSource[];
  selectedSourceId: number | null;
  onSelect: (sourceId: number | null) => void;
}

export default function SourceFilter({ sources, selectedSourceId, onSelect }: SourceFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selectedSourceId === null
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        全部
      </button>
      {sources.map((source) => (
        <button
          key={source.id}
          onClick={() => onSelect(source.id)}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedSourceId === source.id
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {source.name}
          <span className="ml-1.5 text-xs opacity-75">({source.article_count})</span>
        </button>
      ))}
    </div>
  );
}
