import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useKnowledge } from '@/features/intelligence/hooks/useKnowledge';
import { KnowledgeBrowser } from '@/features/intelligence/components/KnowledgeBrowser';
import { BookOpen, MessageSquare, FolderUp } from 'lucide-react';

export const KnowledgePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    docs,
    corpusStats,
    query,
    setQuery,
    results,
    isRetrieving,
    retrievedAt,
    search,
    isLoading,
  } = useKnowledge();

  return (
    <PageContainer
      title="Knowledge / RAG"
      description="The shared memory every AIDEN agent retrieves from — contracts, postmortems, runbooks, and lineage"
      fullWidth
      breadcrumbs={[{ label: 'AIDEN' }, { label: 'Intelligence' }, { label: 'Knowledge / RAG' }]}
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="ai" size="sm" dot>
            <BookOpen className="w-3 h-3 mr-1" />
            {corpusStats.docs} docs indexed
          </Badge>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<FolderUp className="w-3.5 h-3.5" />}
            onClick={() => navigate('/projects')}
          >
            Add documents
          </Button>
          <Button
            size="sm"
            leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/workspace?p=${encodeURIComponent('/knowledge')}&focus=knowledge`)}
          >
            Ask AIDEN about this memory
          </Button>
        </div>
      }
    >
      <KnowledgeBrowser
        docs={docs}
        corpusStats={corpusStats}
        query={query}
        onQueryChange={setQuery}
        results={results}
        isRetrieving={isRetrieving}
        retrievedAt={retrievedAt}
        onSearch={search}
        isLoading={isLoading}
      />
    </PageContainer>
  );
};

export default KnowledgePage;
