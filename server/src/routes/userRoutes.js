const express = require('express');
const {
  addUserToOrganization,
  listOrganizationUsers,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/:organizationId/users', authenticateToken, addUserToOrganization);
router.get('/:organizationId/users', authenticateToken, listOrganizationUsers);

router.put('/users/:userId', authenticateToken, updateUser);
router.delete('/users/:userId', authenticateToken, deleteUser);

module.exports = router;
