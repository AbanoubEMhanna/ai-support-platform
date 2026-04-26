# RAG Notes

## Embeddings

- Model: `text-embedding-3-small`
- Dimension: 1536
- Stored in:
  - `DocumentChunk.embedding` (array, Prisma-managed)
  - `DocumentChunk.embedding_vector` (pgvector, SQL-managed) used for similarity search

## Retrieval query

Similarity search uses:

```sql
ORDER BY dc.embedding_vector <=> $queryVector::vector
LIMIT 5
```

## Fallback mode

If `OPENAI_API_KEY` is not set:

- Embeddings: deterministic fake embeddings
- Chat: returns a fallback message (still includes retrieved sources)

