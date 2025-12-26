const bcrypt = require('bcryptjs');
const pool = require('./database');

async function seedDatabase() {
  const client = await pool.connect();

  try {
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      return;
    }

    await client.query('BEGIN');

    const superAdminHash = await bcrypt.hash('Root@2025', 10);
    await client.query(
      `INSERT INTO users (organization_id, email, password_hash, full_name, role, is_active)
       VALUES (NULL, $1, $2, $3, $4, true)`,
      ['root@system.com', superAdminHash, 'System Admin', 'super_admin']
    );

    const orgResult = await client.query(
      `INSERT INTO organizations (name, subdomain, status, subscription_tier, max_users, max_projects)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['Alpha Corp', 'alpha', 'active', 'pro', 25, 15]
    );
    const organizationId = orgResult.rows[0].id;

    const adminHash = await bcrypt.hash('Alpha@123', 10);
    const adminResult = await client.query(
      `INSERT INTO users (organization_id, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [organizationId, 'admin@alpha.com', adminHash, 'Org Admin', 'org_admin']
    );
    const adminId = adminResult.rows[0].id;

    const leadHash = await bcrypt.hash('Lead@123', 10);
    const leadResult = await client.query(
      `INSERT INTO users (organization_id, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [organizationId, 'lead@alpha.com', leadHash, 'Project Lead', 'project_lead']
    );
    const leadId = leadResult.rows[0].id;

    const userHash = await bcrypt.hash('User@123', 10);
    const userResult = await client.query(
      `INSERT INTO users (organization_id, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [organizationId, 'user@alpha.com', userHash, 'Team Member', 'user']
    );
    const userId = userResult.rows[0].id;

    const projectResult = await client.query(
      `INSERT INTO projects (organization_id, name, description, status, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [organizationId, 'Platform Revamp', 'Internal platform redesign', 'active', 'high', adminId]
    );
    const projectId = projectResult.rows[0].id;

    await client.query(
      `INSERT INTO tasks (project_id, organization_id, title, description, status, priority, complexity, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [projectId, organizationId, 'Design Architecture', 'System design and planning', 'in_progress', 'high', 4, leadId]
    );

    await client.query(
      `INSERT INTO tasks (project_id, organization_id, title, description, status, priority, complexity, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [projectId, organizationId, 'API Implementation', 'Build core APIs', 'todo', 'medium', 3, userId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { seedDatabase };
