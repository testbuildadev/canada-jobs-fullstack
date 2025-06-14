// src/App.js
import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [jobs, setJobs]     = useState([]);
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState(null);

  const fetchJobs = async () => {
    setLoad(true);
    setError(null);
    try {
      const res = await axios.get('/api/jobs');
      setJobs(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Canada Job Listings</h1>
        <button onClick={fetchJobs} disabled={loading}>
          {loading ? 'Loading…' : 'Load Jobs'}
        </button>
        {error && <p className="error">Error: {error}</p>}
      </header>
      <main>
        <table>
          <thead>
            <tr>
              <th>Company</th><th>Title</th><th>Location</th><th>Apply</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job, i) => (
              <tr key={i}>
                <td>{job.company}</td>
                <td>{job.title}</td>
                <td>{job.location}</td>
                <td>
                  <a href={job.apply_url} target="_blank" rel="noreferrer">
                    Apply
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

export default App;
