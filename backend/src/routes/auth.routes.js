import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';

const r = Router();
r.post('/register', AuthController.register); //corrected
r.post('/login', AuthController.login); //corrected
r.post('/logout', AuthController.logout); //corrected
r.post('/password-reset', AuthController.requestPasswordReset); //corrected
r.post('/password-reset/:token', AuthController.confirmPasswordReset); //corrected
r.post('/confirm-email/:token', AuthController.confirmEmail); //corrected
r.get('/confirm-email/:token', AuthController.confirmEmail); //corrected
export default r;
