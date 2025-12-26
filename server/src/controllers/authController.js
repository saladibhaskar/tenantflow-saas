const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { validateInput } = require('../utils/validation');
const { logAuditEvent } = require('../utils/auditLog');

const registerOrganization = async (req, res) => {
  const { organizationName, subdomain, adminEmail, adminPassword, adminFullName } = req.body;

  try {
    const errors = validateInput(req.body, {
      organizationName: { required: true },
      subdomain: { required: true, pattern: /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/ },
      adminEmail: { required: true, type: 'email' },
      adminPassword: { required: true, minLength: 8 },
      adminFullName: { required: true }
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const subdomainCheck = await client.query(
        'SELECT id FROM organizations WHERE subdomain = $1',
        [subdomain]
      );
      if (subdomainCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Subdomain already exists' });
      }

      const emailCheck = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [adminEmail]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already exists' });
      }

      const organizationId = uuidv4();
      await client.query(
        `INSERT INTO organizations (id, name, subdomain, status, subscription_tier, max_users, max_projects)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [organizationId, organizationName, subdomain, 'active', 'free', 5, 3]
      );

      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const userId = uuidv4();

      await client.query(
        `INSERT INTO users (id, organization_id, email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, organizationId, adminEmail, passwordHash, adminFullName, 'org_admin', true]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Organization registered',
        data: {
          organizationId,
          subdomain,
          adminUser: {
            id: userId,
            email: adminEmail,
            fullName: adminFullName,
            role: 'org_admin'
          }
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch {
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

const login = async (req, res) => {
  const { email, password, subdomain } = req.body;

  try {
    const errors = validateInput(req.body, {
      email: { required: true, type: 'email' },
      password: { required: true },
      subdomain: { required: true }
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', data: errors });
    }

    const orgResult = await pool.query(
      'SELECT id, status FROM organizations WHERE subdomain = $1',
      [subdomain]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    if (orgResult.rows[0].status !== 'active') {
      return res.status(403).json({ success: false, message: 'Organization inactive' });
    }

    const userResult = await pool.query(
      `SELECT id, email, full_name, password_hash, role, is_active, organization_id
       FROM users WHERE email = $1 AND organization_id = $2`,
      [email, orgResult.rows[0].id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'User inactive' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organization_id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAuditEvent(user.organization_id, user.id, 'LOGIN', 'user', user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          organizationId: user.organization_id
        },
        token,
        expiresIn: 86400
      }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const { userId, organizationId } = req.user;

    const userResult = await pool.query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let organization = null;
    if (organizationId) {
      const orgResult = await pool.query(
        'SELECT id, name, subdomain, subscription_tier, max_users, max_projects FROM organizations WHERE id = $1',
        [organizationId]
      );
      if (orgResult.rows.length > 0) {
        organization = orgResult.rows[0];
      }
    }

    res.json({
      success: true,
      data: {
        id: userResult.rows[0].id,
        email: userResult.rows[0].email,
        fullName: userResult.rows[0].full_name,
        role: userResult.rows[0].role,
        isActive: userResult.rows[0].is_active,
        organization
      }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Fetch failed' });
  }
};

const logout = async (req, res) => {
  const { userId, organizationId } = req.user;
  await logAuditEvent(organizationId, userId, 'LOGOUT', 'user', userId);
  res.json({ success: true });
};

module.exports = {
  registerOrganization,
  login,
  getCurrentUser,
  logout
};
