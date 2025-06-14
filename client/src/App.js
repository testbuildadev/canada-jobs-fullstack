import React, { useState, useMemo } from 'react';
import axios from 'axios';
import './App.css';

const API = process.env.REACT_APP_API_URL;

export default function App() {
  const [jobs, setJobs]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  // Filters
  const [searchTerm, setSearchTerm]           = useState('');
  const [companyFilter, setCompanyFilter]     = useState('All');
  const [categoryFilter, setCategoryFilter]   = useState('All');
  const [locationFilter, setLocationFilter]   = useState('');
  const [remoteOnly, setRemoteOnly]           = useState(false);

  const uniqueCompanies  = useMemo(() => ['All', ...new Set(jobs.map(j=>j.company))], [jobs]);
  const uniqueCategories = useMemo(() => ['All', ...new Set(jobs.map(j=>j.category))], [jobs]);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API}/api/jobs`);
      setJobs(data);
    } catch (e) {
      setError(e.response?.statusText || e.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () => jobs.filter(job => {
      const st = searchTerm.toLowerCase();
      if (st && !(job.title.toLowerCase().includes(st) || job.company.toLowerCase().includes(st))) return false;
      if (companyFilter!=='All' && job.company!==companyFilter) return false;
      if (categoryFilter!=='All' && job.category!==categoryFilter) return false;
      if (locationFilter && !job.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (remoteOnly && !job.location.toLowerCase().includes('remote')) return false;
      return true;
    }),
    [jobs, searchTerm, companyFilter, categoryFilter, locationFilter, remoteOnly]
  );

  return (
    <div className="App">
      <header className="header">
        <h1>Job Listings (Canada & USA)</h1>
        <button className="load-button" onClick={fetchJobs} disabled={loading}>
          {loading ? 'Loading…' : 'Load Jobs'}
        </button>
      </header>
      {error && <div className="error">Error: {error}</div>}
      <div className="filters">
        <input type="text" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
        <select value={companyFilter} onChange={e=>setCompanyFilter(e.target.value)}>
          {uniqueCompanies.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>
          {uniqueCategories.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="text" placeholder="Location..." value={locationFilter} onChange={e=>setLocationFilter(e.target.value)} />
        <label><input type="checkbox" checked={remoteOnly} onChange={e=>setRemoteOnly(e.target.checked)} /> Remote Only</label>
      </div>
      <div className="jobs-grid">
        {filtered.length > 0 ? filtered.map((job,i)=>(
          <div key={i} className="job-card">
            <div className="job-title">{job.title}</div>
            <div className="job-company-location">{job.company} • {job.location}</div>
            <div className="job-category">{job.category}</div>
            <a href={job.apply_url} className="apply-button" target="_blank" rel="noopener noreferrer">Apply</a>
          </div>
        )) : <p className="no-jobs">No jobs match your filters.</p>}
      </div>
    </div>
  );
}