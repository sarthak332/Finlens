// src/App.jsx

import { useState } from 'react';

function App() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSummary('');

    try {
      const response = await fetch('http://localhost:3001/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      setError('Failed to fetch summary. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-800 rounded-xl shadow-lg p-8 space-y-6">
        <h1 className="text-4xl font-extrabold text-white text-center">FinLens AI Analyzer</h1>
        <p className="text-center text-slate-400">
          Enter a news article URL to get a concise, AI-powered summary and sentiment analysis.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a news article URL here..."
            className="flex-grow p-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto px-6 py-3 rounded-lg font-bold transition-all duration-300 ease-in-out
                       bg-sky-600 hover:bg-sky-500 text-white
                       disabled:bg-slate-700 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analyzing...' : 'Analyze Article'}
          </button>
        </form>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg text-center">
            {error}
          </div>
        )}

        {summary && (
          <div className="bg-slate-700 p-6 rounded-lg shadow-inner">
            <h2 className="text-2xl font-bold mb-4 text-white">AI-Powered Summary</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
