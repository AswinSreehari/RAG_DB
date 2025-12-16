const express = require('express');
const router = express.Router();
const projectService = require('../services/projectService');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const projects = await projectService.getProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error in project route:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
