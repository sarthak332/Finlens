// src/App.tsx

import { useState, useEffect, type FormEvent } from 'react';

// Define a type for a single article for type safety
interface Article {
  _id: string;
  url: string;
  summary: string;
  sentiment: string;
  createdAt: string;
}

function App() {
  const [url, setUrl] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [sentiment, setSentiment] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  
  // New state to store saved articles
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [isFetchingArticles, setIsFetchingArticles] = useState<boolean>(false);

  // Function to fetch articles from the backend
  const fetchArticles = async () => {
    setIsFetchingArticles(true);
    const token = localStorage.getItem('finlens_token');
    if (!token) {
      setIsFetchingArticles(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/articles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSavedArticles(data);
      }
    } catch (error) {
      console.error('Failed to fetch saved articles:', error);
    }
    setIsFetchingArticles(false);
  };

  // Check for existing token and fetch articles on load
  useEffect(() => {
    const token = localStorage.getItem('finlens_token');
    if (token) {
      setIsAuthenticated(true);
      fetchArticles();
    }
  }, []);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);

    const endpoint = isLogin ? 'http://localhost:3001/api/login' : 'http://localhost:3001/api/register';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('finlens_token', data.token);
        localStorage.setItem('finlens_username', data.username);
        setIsAuthenticated(true);
        setAuthError(null);
        // Fetch articles immediately after a successful login
        fetchArticles();
      } else {
        setAuthError(data.message);
      }
    } catch (err) {
      setAuthError('An error occurred. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('finlens_token');
    localStorage.removeItem('finlens_username');
    setIsAuthenticated(false);
    setSavedArticles([]); // Clear saved articles on logout
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSummary('');
    setSentiment('');

    const token = localStorage.getItem('finlens_token');
    if (!token) {
      setError('You must be logged in to analyze articles.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Network response was not ok');
      }

      const data = await response.json();
      setSummary(data.summary);
      setSentiment(data.sentiment);
      
      // After a successful summary, refresh the saved articles list
      fetchArticles();
      
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      setError((err as Error).message || 'Failed to fetch summary. The website may be blocking requests. Please try a different URL.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-lg p-8 space-y-6">
          <h1 className="text-3xl font-bold text-white text-center">
            FinLens AI Analyzer
          </h1>
          <p className="text-center text-slate-400">
            {isLogin ? 'Log in to your account' : 'Create a new account'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full p-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full px-6 py-3 rounded-lg font-bold transition-all duration-300 ease-in-out
                       bg-sky-600 hover:bg-sky-500 text-white
                       disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {isAuthLoading ? 'Processing...' : (isLogin ? 'Log In' : 'Register')}
            </button>
          </form>

          {authError && (
            <div className="bg-red-500 text-white p-4 rounded-lg text-center">
              {authError}
            </div>
          )}

          <p className="text-center text-slate-400 cursor-pointer hover:text-white"
             onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Don\'t have an account? Register' : 'Already have an account? Log In'}
          </p>
        </div>
      </div>
    );
  }

  // Main UI for logged-in users
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl bg-slate-800 rounded-xl shadow-lg p-8 space-y-6 mt-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-extrabold text-white">FinLens AI Analyzer</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400">Welcome, {localStorage.getItem('finlens_username')}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg font-bold transition-all duration-300 ease-in-out
                         bg-red-600 hover:bg-red-500 text-white"
            >
              Log Out
            </button>
          </div>
        </div>

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

        {(summary || sentiment) && (
          <div className="bg-slate-700 p-6 rounded-lg shadow-inner space-y-4">
            <h2 className="text-2xl font-bold text-white">AI-Powered Summary</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{summary}</p>
            <p className={`font-bold text-lg ${sentiment === 'Positive' ? 'text-green-400' : sentiment === 'Negative' ? 'text-red-400' : 'text-yellow-400'}`}>
              Sentiment: {sentiment}
            </p>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl bg-slate-800 rounded-xl shadow-lg p-8 space-y-6 mt-8">
        <h2 className="text-2xl font-bold text-white">Your Saved Articles</h2>
        
        {isFetchingArticles ? (
          <p className="text-center text-slate-400">Loading your articles...</p>
        ) : savedArticles.length === 0 ? (
          <p className="text-center text-slate-400">You have no saved articles. Analyze one to see it here!</p>
        ) : (
          <div className="space-y-4">
            {savedArticles.map((article) => (
              <div key={article._id} className="bg-slate-700 p-4 rounded-lg">
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-lg text-sky-400 hover:text-sky-300 font-semibold truncate block"
                >
                  {article.url}
                </a>
                <p className="text-slate-300 mt-2">{article.summary.substring(0, 150)}...</p>
                <p className={`font-bold text-sm mt-1 ${article.sentiment === 'Positive' ? 'text-green-400' : article.sentiment === 'Negative' ? 'text-red-400' : 'text-yellow-400'}`}>
                  Sentiment: {article.sentiment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
