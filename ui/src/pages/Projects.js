import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const ProjectDetails = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    try {
      const tasksRes = await api.get(`/projects/${projectId}/tasks`);
      setTasks(tasksRes.data.data.tasks || []);
    } catch (err) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="container mt-5">Loading...</div>;
  if (error) return <div className="container mt-5 alert alert-danger">{error}</div>;

  return (
    <div className="container mt-5 mb-5">
      <h2>Project Tasks</h2>

      {tasks.length === 0 ? (
        <p className="text-muted">No tasks found</p>
      ) : (
        <ul className="list-group">
          {tasks.map(t => (
            <li key={t.id} className="list-group-item d-flex justify-content-between">
              <div>
                <strong>{t.title}</strong>
                <div className="text-muted small">{t.description}</div>
              </div>
              <span className={`badge bg-${t.status === 'completed' ? 'success' : 'secondary'}`}>
                {t.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProjectDetails;
