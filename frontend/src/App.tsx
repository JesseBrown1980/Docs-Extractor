import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';

interface Job {
  status: 'processing' | 'completed' | 'failed';
  result?: {
    response: {
      content: Array<{ type: string; text: string }>;
    };
  };
  error?: string;
}

interface Doc {
  name: string;
  path: string;
}

function App() {
  const [docsUrl, setDocsUrl] = useState('');
  const [extractionType, setExtractionType] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedDocs, setGeneratedDocs] = useState<Doc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string | null>(null);

  const API_BASE = 'http://localhost:8000';

  const loadGeneratedDocs = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/docs`);
      const data = await response.json();
      setGeneratedDocs(data.docs || []);
    } catch (err) {
      console.error('Error loading docs:', err);
    }
  };

  const loadDocContent = async (filename: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/docs/${filename}`);
      const content = await response.text();
      setDocContent(content);
      setSelectedDoc(filename);
    } catch (err) {
      console.error('Error loading doc content:', err);
    }
  };

  useEffect(() => {
    loadGeneratedDocs();
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/job/${jobId}`);
        const job: Job = await response.json();

        if (job.status === 'completed') {
          clearInterval(pollInterval);
          setLoading(false);
          
          if (job.result?.response?.content) {
            const textContent = job.result.response.content
              .filter(item => item.type === 'text')
              .map(item => item.text)
              .join('\n\n');
            setResult(textContent);
          }
          
          setJobId(null);
          loadGeneratedDocs();
        } else if (job.status === 'failed') {
          clearInterval(pollInterval);
          setLoading(false);
          setError(job.error || 'Extraction failed');
          setJobId(null);
        }
      } catch (err) {
        console.error('Error polling job:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ docsUrl, extractionType }),
      });

      if (!response.ok) {
        throw new Error('Failed to start extraction');
      }

      const data = await response.json();
      setJobId(data.jobId);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const exampleTypes = [
    'Quick installation guide',
    'Main features overview',
    'Getting started tutorial',
    'API reference summary',
    'Configuration guide',
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1>📚 Docs Extractor</h1>
          <p className="subtitle">AI-powered documentation generator using Zypher Agent</p>
        </div>
      </header>

      <main className="container main-content">
        <div className="grid">
          <div className="form-section">
            <div className="card">
              <h2>Extract Documentation</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="docsUrl">
                    Documentation URL
                    <span className="required">*</span>
                  </label>
                  <input
                    id="docsUrl"
                    type="url"
                    placeholder="https://example.com/docs"
                    value={docsUrl}
                    onChange={(e) => setDocsUrl(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <small>Enter the URL of the documentation you want to extract</small>
                </div>

                <div className="form-group">
                  <label htmlFor="extractionType">
                    What do you want?
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="extractionType"
                    placeholder="e.g., Quickstart guide with installation steps and examples"
                    value={extractionType}
                    onChange={(e) => setExtractionType(e.target.value)}
                    required
                    disabled={loading}
                    rows={3}
                  />
                  <small>Describe what you want to extract from the documentation</small>
                </div>

                <div className="example-types">
                  <strong>Example requests:</strong>
                  {exampleTypes.map((type, i) => (
                    <button
                      key={i}
                      type="button"
                      className="example-btn"
                      onClick={() => setExtractionType(type)}
                      disabled={loading}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Processing...
                    </>
                  ) : (
                    'Extract Documentation'
                  )}
                </button>
              </form>

              {error && (
                <div className="alert alert-error">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>

            <div className="card">
              <h3>Generated Documents</h3>
              {generatedDocs.length === 0 ? (
                <p className="empty-state">No documents generated yet</p>
              ) : (
                <ul className="docs-list">
                  {generatedDocs.map((doc) => (
                    <li key={doc.name}>
                      <button
                        className={`doc-btn ${selectedDoc === doc.name ? 'active' : ''}`}
                        onClick={() => loadDocContent(doc.name)}
                      >
                        📄 {doc.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="output-section">
            <div className="card output-card">
              <h2>Output</h2>
              {loading && (
                <div className="loading-state">
                  <div className="spinner large"></div>
                  <p>AI is extracting and generating documentation...</p>
                  <small>This may take a few minutes depending on the size of the documentation</small>
                </div>
              )}

              {result && (
                <div className="result">
                  <div className="result-header">
                    <span className="badge badge-success">✓ Generated</span>
                  </div>
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {docContent && !result && (
                <div className="result">
                  <div className="result-header">
                    <span className="badge badge-info">📄 {selectedDoc}</span>
                  </div>
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {docContent}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {!loading && !result && !docContent && (
                <div className="empty-state">
                  <p>👈 Enter a documentation URL and select what you want to extract</p>
                  <p className="hint">The AI will analyze the documentation and generate a comprehensive guide for you</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>
            Powered by <a href="https://zypher.corespeed.io" target="_blank" rel="noopener noreferrer">Zypher Agent</a>
            {' '}&amp;{' '}
            <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer">Firecrawl</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

