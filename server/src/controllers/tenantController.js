const pool = require('../config/database');
const { logAuditEvent } = require('../utils/auditLog');

const getOrganizationDetails = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { role, organizationId: userOrgId } = req.user;

    if (role !== 'super_admin' && userOrgId !== organizationId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const orgResult = await pool.query(
      `SELECT id, name, subdomain, status, subscription_tier, max_users, max_projects, created_at
       FROM organizations WHERE id = $1`,
      [organizationId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const organization = orgResult.rows[0];

    const usersCount = await pool.query(
      'SELECT COUNT(*) FROM users WHERE organization_id = $1 AND role != $2',
      [organizationId, 'super_admin']
    );
    const projectsCount = await pool.query(
      'SELECT COUNT(*) FROM projects WHERE organization_id = $1',
      [organizationId]
    );
    const tasksCount = await pool.query(
      'SELECT COUNT(*) FROM tasks WHERE organization_id = $1',
      [organizationId]
    );

    res.json({
      success: true,
      data: {
        id: organization.id,
        name: organization.name,
        subdomain: organization.subdomain,
        status: organization.status,
        subscriptionTier: organization.subscription_tier,
        maxUsers: organization.max_users,
        maxProjects: organization.max_projects,
        createdAt: organization.created_at,
        stats: {
          totalUsers: parseInt(usersCount.rows[0].count),
          totalProjects: parseInt(projectsCount.rows[0].count),
          totalTasks: parseInt(tasksCount.rows[0].count)
        }
      }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Fetch failed' });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { name, status, subscriptionTier, maxUsers, maxProjects } = req.body;
    const { role, organizationId: userOrgId, userId } = req.user;

    if (role !== 'super_admin' && userOrgId !== organizationId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const orgCheck = await pool.query(
      'SELECT id FROM organizations WHERE id = $1',
      [organizationId]
    );

    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const updates = [];
    const values = [organizationId];
    let index = 2;

    if (name) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }

    if (status && role === 'super_admin') {
      updates.push(`status = $${index++}`);
      values.push(status);
    }

    if (subscriptionTier && role === 'super_admin') {
      updates.push(`subscription_tier = $${index++}`);
      values.push(subscriptionTier);
    }

    if (maxUsers && role === 'super_admin') {
      updates.push(`max_users = $${index++}`);
      values.push(maxUsers);
    }

    if (maxProjects && role === 'super_admin') {
      updates.push(`max_projects = $${index++}`);
      values.push(maxProjects);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const query = `UPDATE organizations SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, values);

    await logAuditEvent(organizationId, userId, 'UPDATE_ORGANIZATION', 'organization', organizationId);

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

const listAllOrganizations = async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { page = 1, limit = 10, status, subscriptionTier } = req.query;
    const offset = (page - 1) * limit;

    let baseQuery = 'FROM organizations WHERE 1=1';
    const values = [];
    let index = 1;

    if (status) {
      baseQuery += ` AND status = $${index++}`;
      values.push(status);
    }

    if (subscriptionTier) {
      baseQuery += ` AND subscription_tier = $${index++}`;
      values.push(subscriptionTier);
    }

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, values);
    const total = parseInt(countResult.rows[0].count);

    const orgResult = await pool.query(
      `SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT $${index} OFFSET $${index + 1}`,
      [...values, limit, offset]
    );

    const organizations = await Promise.all(
      orgResult.rows.map(async (org) => {
        const usersCount = await pool.query(
          'SELECT COUNT(*) FROM users WHERE organization_id = $1 AND role != $2',
          [org.id, 'super_admin']
        );
        const projectsCount = await pool.query(
          'SELECT COUNT(*) FROM projects WHERE organization_id = $1',
          [org.id]
        );

        return {
          id: org.id,
          name: org.name,
          subdomain: org.subdomain,
          status: org.status,
          subscriptionTier: org.subscription_tier,
          totalUsers: parseInt(usersCount.rows[0].count),
          totalProjects: parseInt(projectsCount.rows[0].count),
          createdAt: org.created_at
        };
      })
    );

    res.json({
      success: true,
      data: {
        organizations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrganizations: total,
          limit: parseInt(limit)
        }
      }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Fetch failed' });
  }
};

module.exports = {
  getOrganizationDetails,
  updateOrganization,
  listAllOrganizations
};
