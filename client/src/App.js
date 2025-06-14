import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API = process.env.REACT_APP_API_URL || '';

function App() {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API}/api/jobs`);
      setJobs(data);
    } catch (err) {
      setError(err.response?.statusText || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Canada Job Listings</h1>
      <button onClick={fetchJobs} disabled={loading} style={{ margin: '1rem 0', padding: '0.5rem 1rem' }}>
        {loading ? 'Loading…' : 'Load Jobs'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {jobs.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Company','Title','Location','Apply'].map(c => (
                <th key={c} style={{ border:'1px solid #ccc', padding:'0.5rem', background:'#f5f5f5' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job,i) => (
              <tr key={i} style={{ background: i%2?'#fafafa':'white' }}>
                <td style={{ border:'1px solid #ccc', padding:'0.5rem' }}>{job.company}</td>
                <td style={{ border:'1px solid #ccc', padding:'0.5rem' }}>{job.title}</td>
                <td style={{ border:'1px solid #ccc', padding:'0.5rem' }}>{job.location}</td>
                <td style={{ border:'1px solid #ccc', padding:'0.5rem' }}>
                  <a href={job.apply_url} target="_blank" rel="noopener noreferrer">Apply</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {jobs.length===0 && !loading && <p>No jobs loaded yet.</p>}
    </div>
  );
}

export default App;
