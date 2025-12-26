const express = require('express');
const {
  getOrganizationDetails,
  updateOrganization,
  listAllOrganizations
} = require('../controllers/tenantController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorization');

const router = express.Router();

router.get('/', authenticateToken, authorizeRoles('super_admin'), listAllOrganizations);
router.get('/:organizationId', authenticateToken, getOrganizationDetails);
router.put('/:organizationId', authenticateToken, updateOrganization);

module.exports = router;
