'use client';

import { useState } from 'react';

export default function TestImagePage() {
  const [prompt, setPrompt] = useState('a simple red circle');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Calling direct image API...');
      const response = await fetch('/api/create_image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ query: prompt }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Direct Image Generation Test</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Prompt:
          </label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-3 bg-gray-900 border border-green-400 rounded text-green-400"
            placeholder="Enter your image prompt..."
          />
        </div>

        <button
          onClick={generateImage}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded mb-6"
        >
          {loading ? 'Generating...' : 'Generate Image'}
        </button>

        {error && (
          <div className="bg-red-900 border border-red-400 text-red-400 p-4 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="bg-gray-900 border border-green-400 p-6 rounded">
            <h2 className="text-xl font-bold mb-4">Generated Image</h2>
            <p className="mb-2"><strong>Prompt:</strong> {result.prompt}</p>
            <p className="mb-2"><strong>Timestamp:</strong> {new Date(result.timestamp).toLocaleString()}</p>
            <p className="mb-4"><strong>Image Data Length:</strong> {result.image?.length || 0} characters</p>
            
            {result.image && (
              <div className="mt-4">
                <img
                  src={result.image}
                  alt="Generated Image"
                  className="max-w-full h-auto border border-green-400 rounded"
                  onLoad={() => console.log('Image loaded successfully')}
                  onError={(e) => console.error('Image failed to load:', e)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
