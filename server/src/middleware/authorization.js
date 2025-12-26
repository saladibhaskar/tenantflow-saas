const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ success: false, message: 'Forbidden' });
  };
};

const authorizeOrganizationAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const organizationIdFromParam = req.params.organizationId;
  const { organizationId, role } = req.user;

  if (role === 'super_admin') {
    return next();
  }

  if (organizationId === organizationIdFromParam) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Forbidden' });
};

module.exports = { authorizeRoles, authorizeOrganizationAccess };
