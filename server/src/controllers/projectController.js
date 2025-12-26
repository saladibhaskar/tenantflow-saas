const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { logAuditEvent } = require('../utils/auditLog');

const createProject = async (req, res) => {
  try {
    const { name, description, priority = 'medium', status = 'active' } = req.body;
    const { userId, organizationId } = req.user;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name required' });
    }

    const orgResult = await pool.query(
      'SELECT max_projects FROM organizations WHERE id = $1',
      [organizationId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM projects WHERE organization_id = $1',
      [organizationId]
    );

    if (parseInt(countResult.rows[0].count) >= orgResult.rows[0].max_projects) {
      return res.status(403).json({ success: false, message: 'Project limit reached' });
    }

    const projectId = uuidv4();

    await pool.query(
      `INSERT INTO projects (id, organization_id, name, description, status, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [projectId, organizationId, name, description || null, status, priority, userId]
    );

    await logAuditEvent(organizationId, userId, 'CREATE_PROJECT', 'project', projectId);

    res.status(201).json({
      success: true,
      data: {
        id: projectId,
        name,
        description: description || null,
        status,
        priority
      }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Create failed' });
  }
};

const listProjects = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const { organizationId } = req.user;

    const offset = (page - 1) * limit;
    const values = [organizationId];
    let index = 2;

    let base = `
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.organization_id = $1
    `;

    if (status) {
      base += ` AND p.status = $${index++}`;
      values.push(status);
    }

    if (search) {
      base += ` AND p.name ILIKE $${index++}`;
      values.push(`%${search}%`);
    }

    const countResult = await pool.query(`SELECT COUNT(DISTINCT p.id) ${base}`, values);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.status, p.priority, p.created_at,
              u.full_name,
              COUNT(t.id) AS task_count,
              SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_task_count
       ${base}
       GROUP BY p.id, u.full_name
       ORDER BY p.created_at DESC
       LIMIT $${index} OFFSET $${index + 1}`,
      [...values, limit, offset]
    );

    res.json({
      success: true,
      data: {
        projects: result.rows.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          priority: p.priority,
          createdBy: p.full_name,
          taskCount: parseInt(p.task_count) || 0,
          completedTaskCount: parseInt(p.completed_task_count) || 0,
          createdAt: p.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Fetch failed' });
  }
};

const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, status, priority } = req.body;
    const { userId, organizationId, role } = req.user;

    const check = await pool.query(
      'SELECT created_by, organization_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (check.rows.length === 0 || check.rows[0].organization_id !== organizationId) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (role !== 'org_admin' && check.rows[0].created_by !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updates = [];
    const values = [projectId];
    let index = 2;

    if (name) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    if (status) {
      updates.push(`status = $${index++}`);
      values.push(status);
    }

    if (priority) {
      updates.push(`priority = $${index++}`);
      values.push(priority);
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No updates' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $1`,
      values
    );

    await logAuditEvent(organizationId, userId, 'UPDATE_PROJECT', 'project', projectId);

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, organizationId, role } = req.user;

    const check = await pool.query(
      'SELECT created_by, organization_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (check.rows.length === 0 || check.rows[0].organization_id !== organizationId) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (role !== 'org_admin' && check.rows[0].created_by !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);

    await logAuditEvent(organizationId, userId, 'DELETE_PROJECT', 'project', projectId);

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

module.exports = {
  createProject,
  listProjects,
  updateProject,
  deleteProject
};
