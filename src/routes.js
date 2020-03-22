import { Router } from 'express';
import multer from 'multer';

// controllers
import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import FileController from './app/controllers/FileController';
import ProviderController from './app/controllers/ProviderController';
import AppointmentController from './app/controllers/AppointmentController';
import ScheduleController from './app/controllers/ScheduleController';
import NotificationController from './app/controllers/NotificationController';
import AvailableController from './app/controllers/AvailableController';

import multerConfig from './config/multer';

// middlewares
import JWTauthMW from './app/middlewares/auth';

const upload = multer(multerConfig);

const routes = new Router();

routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);

// ROUTES BELOW WILL REQUIRE JWT AUTH //
routes.use(JWTauthMW);

routes.put('/users', UserController.update);

// PROVIDER ROUTES
routes.get('/providers', ProviderController.index);
routes.get(
  '/providers/:providerId/available',
  AvailableController.index
);

// FILES
routes.post(
  '/files',
  upload.single('file'),
  FileController.store
);

// APPOINTMENTS (for users)
routes.get('/appointments', AppointmentController.index);
routes.post('/appointments', AppointmentController.store);
routes.delete('/appointments/:id', AppointmentController.delete);

// CHECK SCHEDULE (for providers)
routes.get('/schedule', ScheduleController.index);

// NOTIFICATIONS (for providers)
routes.get('/notifications', NotificationController.index);
routes.put('/notifications/:id', NotificationController.update);

export default routes;
