import { Router } from 'express';
import { createProject, getProjects, deleteProject, updateProject } from '../controllers/projectController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All project routes require authentication
router.use(authMiddleware);

router.post('/', createProject);
router.get('/', getProjects);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
