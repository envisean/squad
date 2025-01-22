-- Add metadata columns to documents table
ALTER TABLE documents
ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN url TEXT,
ADD COLUMN title TEXT,
ADD COLUMN last_crawled_at TIMESTAMPTZ,
ADD COLUMN content_hash TEXT,
ADD COLUMN content_type TEXT,
ADD COLUMN word_count INTEGER,
ADD COLUMN source_type TEXT NOT NULL DEFAULT 'website',
ADD COLUMN parent_id BIGINT REFERENCES documents(id),
ADD COLUMN collection TEXT,
ADD COLUMN tags TEXT[],
ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Create indexes for common queries
CREATE INDEX idx_documents_url ON documents(url);
CREATE INDEX idx_documents_collection ON documents(collection);
CREATE INDEX idx_documents_source_type ON documents(source_type);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_content_type ON documents(content_type);

-- Add a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a more flexible enum for source types
CREATE TYPE source_category AS ENUM (
    'web',           -- websites, web pages, html content
    'document',      -- structured documents (doc, docx, txt, rtf)
    'unstructured',  -- pdfs, scanned documents
    'media',         -- images, audio, video
    'email',         -- email messages
    'chat',          -- chat messages, slack, discord
    'code',          -- source code, documentation
    'database',      -- database dumps, exports
    'other'          -- catch-all for uncategorized sources
);

-- Create an enum for document status
CREATE TYPE document_status AS ENUM (
    'active',
    'archived',
    'pending',
    'failed'
);

-- Add helper function to get mime type category
CREATE OR REPLACE FUNCTION get_source_category(mime_type TEXT)
RETURNS source_category AS $$
BEGIN
    RETURN CASE
        WHEN mime_type LIKE 'text/html' OR mime_type LIKE 'application/xml' 
            THEN 'web'::source_category
        WHEN mime_type IN ('application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'text/plain', 
                          'application/rtf')
            THEN 'document'::source_category
        WHEN mime_type = 'application/pdf' 
            THEN 'unstructured'::source_category
        WHEN mime_type LIKE 'image/%' OR mime_type LIKE 'video/%' OR mime_type LIKE 'audio/%'
            THEN 'media'::source_category
        WHEN mime_type LIKE 'message/rfc822' OR mime_type = 'application/vnd.ms-outlook'
            THEN 'email'::source_category
        WHEN mime_type LIKE 'text/%'
            THEN 'document'::source_category
        ELSE 'other'::source_category
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comment on table and columns
COMMENT ON TABLE documents IS 'Stores vectorized documents from various sources';
COMMENT ON COLUMN documents.source_type IS 'Specific source type (e.g. "gmail", "confluence", "file-upload")';
COMMENT ON COLUMN documents.content_type IS 'MIME type or format of the content';
COMMENT ON COLUMN documents.parent_id IS 'ID of parent document if this is a chunk/section';
COMMENT ON COLUMN documents.collection IS 'Logical grouping of documents (e.g. "knowledge-base", "emails-2024")';
COMMENT ON COLUMN documents.tags IS 'Array of tags for categorizing documents';
COMMENT ON COLUMN documents.status IS 'Document status (active, archived, etc)'; 