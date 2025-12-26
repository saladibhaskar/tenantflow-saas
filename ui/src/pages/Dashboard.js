import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ projects: 0 });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/projects?limit=5');
      const projects = res.data.data.projects || [];

      setRecentProjects(projects);
      setStats({
        projects: res.data.data.total || projects.length
      });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mt-5">Loading...</div>;
  }

  return (
    <div className="container mt-5 mb-5">
      <h1 className="mb-4">Dashboard</h1>

      <div className="row mb-4">
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-value">{stats.projects}</div>
            <div className="stat-label">Total Projects</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-primary text-white">Recent Projects</div>
        <div className="card-body">
          {recentProjects.length > 0 ? (
            <ul className="list-group list-group-flush">
              {recentProjects.map(p => (
                <li key={p.id} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{p.name}</strong>
                    </div>
                    <span className={`badge bg-${p.status === 'active' ? 'success' : 'secondary'}`}>
                      {p.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No projects found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
