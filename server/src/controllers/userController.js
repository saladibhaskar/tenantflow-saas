const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { logAuditEvent } = require('../utils/auditLog');

const addUserToOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { email, password, fullName, role = 'user' } = req.body;
    const { organizationId: userOrgId, role: userRole, userId } = req.user;

    if (userRole !== 'org_admin' || userOrgId !== organizationId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Weak password' });
    }

    const orgResult = await pool.query(
      'SELECT max_users FROM organizations WHERE id = $1',
      [organizationId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const limit = orgResult.rows[0].max_users;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE organization_id = $1',
      [organizationId]
    );

    if (parseInt(countResult.rows[0].count) >= limit) {
      return res.status(403).json({ success: false, message: 'User limit reached' });
    }

    const exists = await pool.query(
      'SELECT id FROM users WHERE organization_id = $1 AND email = $2',
      [organizationId, email]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUserId = uuidv4();

    await pool.query(
      `INSERT INTO users (id, organization_id, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [newUserId, organizationId, email, hash, fullName, role]
    );

    await logAuditEvent(organizationId, userId, 'CREATE_USER', 'user', newUserId);

    res.status(201).json({
      success: true,
      data: {
        id: newUserId,
        email,
        fullName,
        role,
        organizationId
      }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Create failed' });
  }
};

const listOrganizationUsers = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { page = 1, limit = 50, role } = req.query;
    const { organizationId: userOrgId } = req.user;

    if (userOrgId !== organizationId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const offset = (page - 1) * limit;
    const values = [organizationId];
    let index = 2;

    let base = 'FROM users WHERE organization_id = $1';

    if (role) {
      base += ` AND role = $${index++}`;
      values.push(role);
    }

    const countResult = await pool.query(`SELECT COUNT(*) ${base}`, values);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT id, email, full_name, role, is_active, created_at
       ${base} ORDER BY created_at DESC LIMIT $${index} OFFSET $${index + 1}`,
      [...values, limit, offset]
    );

    res.json({
      success: true,
      data: {
        users: result.rows.map(u => ({
          id: u.id,
          email: u.email,
          fullName: u.full_name,
          role: u.role,
          isActive: u.is_active,
          createdAt: u.created_at
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

const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, role, isActive } = req.body;
    const { organizationId, role: userRole, userId: actorId } = req.user;

    if (userRole !== 'org_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const check = await pool.query(
      'SELECT organization_id FROM users WHERE id = $1',
      [userId]
    );

    if (check.rows.length === 0 || check.rows[0].organization_id !== organizationId) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates = [];
    const values = [userId];
    let index = 2;

    if (fullName) {
      updates.push(`full_name = $${index++}`);
      values.push(fullName);
    }

    if (role) {
      updates.push(`role = $${index++}`);
      values.push(role);
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${index++}`);
      values.push(isActive);
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No updates' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $1`,
      values
    );

    await logAuditEvent(organizationId, actorId, 'UPDATE_USER', 'user', userId);

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { organizationId, role, userId: actorId } = req.user;

    if (role !== 'org_admin' || userId === actorId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const check = await pool.query(
      'SELECT organization_id FROM users WHERE id = $1',
      [userId]
    );

    if (check.rows.length === 0 || check.rows[0].organization_id !== organizationId) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await pool.query('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    await logAuditEvent(organizationId, actorId, 'DELETE_USER', 'user', userId);

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

module.exports = {
  addUserToOrganization,
  listOrganizationUsers,
  updateUser,
  deleteUser
};
