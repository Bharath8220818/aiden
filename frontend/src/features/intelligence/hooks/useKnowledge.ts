import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RetrievedChunk } from '../types';
import { fetchKnowledgeDocs, retrieveFromKnowledge } from '../services/intelligence.service';

export function useKnowledge() {
  const docsQuery = useQuery({ queryKey: ['knowledge-docs'], queryFn: fetchKnowledgeDocs });

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RetrievedChunk[] | null>(null);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrievedAt, setRetrievedAt] = useState<string | null>(null);

  const docs = docsQuery.data ?? [];

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setIsRetrieving(true);
    try {
      setResults(await retrieveFromKnowledge(q));
      setRetrievedAt(new Date().toISOString());
    } finally {
      setIsRetrieving(false);
    }
  }, []);

  const corpusStats = {
    docs: docs.length,
    chunks: docs.reduce((s, d) => s + d.chunks, 0),
    tokens: docs.reduce((s, d) => s + d.tokens, 0),
    retrievals: docs.reduce((s, d) => s + d.retrievalCount, 0),
    lastIndexedAt: docs.length
      ? docs.reduce((latest, d) => (d.updatedAt > latest ? d.updatedAt : latest), docs[0].updatedAt)
      : null,
  };

  return {
    docs,
    corpusStats,
    query,
    setQuery,
    results,
    isRetrieving,
    retrievedAt,
    search,
    isLoading: docsQuery.isLoading,
  };
}
