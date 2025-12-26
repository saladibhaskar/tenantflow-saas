const pool = require('../config/database');

const logAuditEvent = async (
  organizationId,
  userId,
  action,
  entityType,
  entityId,
  details = null,
  ipAddress = null
) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        organizationId,
        userId,
        action,
        entityType,
        entityId,
        details,
        ipAddress
      ]
    );
  } catch {}
};

module.exports = { logAuditEvent };
