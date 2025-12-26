const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { logAuditEvent } = require('../utils/auditLog');

/**
 * CREATE TASK
 */
const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, assignedTo, priority = 'medium', dueDate } = req.body;
    const { userId, tenantId } = req.user;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const projectResult = await pool.query(
      'SELECT tenant_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0 || projectResult.rows[0].tenant_id !== tenantId) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (assignedTo) {
      const userResult = await pool.query(
        'SELECT tenant_id FROM users WHERE id = $1',
        [assignedTo]
      );

      if (userResult.rows.length === 0 || userResult.rows[0].tenant_id !== tenantId) {
        return res.status(400).json({ success: false, message: 'Invalid assignee' });
      }
    }

    const taskId = uuidv4();

    await pool.query(
      `INSERT INTO tasks 
       (id, project_id, tenant_id, title, description, priority, assigned_to, due_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'todo')`,
      [taskId, projectId, tenantId, title, description || null, priority, assignedTo || null, dueDate || null]
    );

    await logAuditEvent(tenantId, userId, 'CREATE_TASK', 'task', taskId);

    res.status(201).json({
      success: true,
      data: { id: taskId, title, priority }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
};

/**
 * LIST PROJECT TASKS
 */
const listProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, assignedTo, priority } = req.query;
    const { tenantId } = req.user;

    const projectCheck = await pool.query(
      'SELECT tenant_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectCheck.rows.length === 0 || projectCheck.rows[0].tenant_id !== tenantId) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    let query = 'SELECT * FROM tasks WHERE project_id = $1';
    const values = [projectId];
    let idx = 2;

    if (status) {
      query += ` AND status = $${idx++}`;
      values.push(status);
    }
    if (assignedTo) {
      query += ` AND assigned_to = $${idx++}`;
      values.push(assignedTo);
    }
    if (priority) {
      query += ` AND priority = $${idx++}`;
      values.push(priority);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);

    res.json({ success: true, data: { tasks: result.rows } });
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
};

/**
 * UPDATE TASK (includes status updates)
 */
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, assignedTo, dueDate } = req.body;
    const { userId, tenantId } = req.user;

    const check = await pool.query(
      'SELECT tenant_id FROM tasks WHERE id = $1',
      [taskId]
    );

    if (check.rows.length === 0 || check.rows[0].tenant_id !== tenantId) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const updates = [];
    const values = [taskId];
    let idx = 2;

    if (title) { updates.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (status) { updates.push(`status = $${idx++}`); values.push(status); }
    if (priority) { updates.push(`priority = $${idx++}`); values.push(priority); }
    if (assignedTo !== undefined) { updates.push(`assigned_to = $${idx++}`); values.push(assignedTo); }
    if (dueDate !== undefined) { updates.push(`due_date = $${idx++}`); values.push(dueDate); }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $1`,
      values
    );

    await logAuditEvent(tenantId, userId, 'UPDATE_TASK', 'task', taskId);

    res.json({ success: true });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
};

/**
 * DELETE TASK
 */
const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId, tenantId } = req.user;

    const check = await pool.query(
      'SELECT tenant_id FROM tasks WHERE id = $1',
      [taskId]
    );

    if (check.rows.length === 0 || check.rows[0].tenant_id !== tenantId) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    await logAuditEvent(tenantId, userId, 'DELETE_TASK', 'task', taskId);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
};

module.exports = {
  createTask,
  listProjectTasks,
  updateTask,
  deleteTask
};
