import { Router } from 'express';
import addressesRoutes from '../api/Addresses/index.js';
import proxiesRoutes from '../api/Proxies/index.js';
import tasksRoutes from '../api/Tasks/index.js';
import logsRoutes from '../api/Logs/index.js';
import settingsRoutes from '../api/Settings/index.js';
import paymentProfilesRoutes from '../api/PaymentProfiles/index.js';
import validationHandler from '../helpers/validation-handler.js';

const router = Router();

router.get('/', (req, res) => res.send('Welcome to the SneakerBot API'));
router.use('/addresses', addressesRoutes);
router.use('/proxies', proxiesRoutes);
router.use('/tasks', tasksRoutes);
router.use('/logs', logsRoutes);
router.use('/settings', settingsRoutes);
router.use('/payment-profiles', paymentProfilesRoutes);

router.use(validationHandler);

export default router;
