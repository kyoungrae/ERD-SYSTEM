import { Router } from 'express';
import { signup, login, requestVerification } from '../controllers/authController';

const router = Router();

router.post('/request-verification', requestVerification);
router.post('/signup', signup);
router.post('/login', login);

export default router;
