const express = require('express');
const {
  createTask,
  listProjectTasks,
  updateTask,
  deleteTask
} = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/:projectId/tasks', authenticateToken, createTask);
router.get('/:projectId/tasks', authenticateToken, listProjectTasks);
router.put('/:taskId', authenticateToken, updateTask);
router.delete('/:taskId', authenticateToken, deleteTask);

module.exports = router;
