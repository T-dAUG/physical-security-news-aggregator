import React, { useState } from 'react';

function ManualScrapeButton({ apiUrl }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScrape = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`${apiUrl}/api/scrape`, {
        method: 'POST'
      });
      const data = await response.json();
      setResult(data.message || 'Scrape triggered!');
    } catch (err) {
      setResult('Error triggering scrape');
    }
    setLoading(false);
  };

  return (
    <div>
      <button onClick={handleScrape} disabled={loading}>
        {loading ? 'Scraping...' : 'Fetch Latest Articles'}
      </button>
      {result && <div>{result}</div>}
    </div>
  );
}