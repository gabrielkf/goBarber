import * as Yup from 'yup';
import {
  startOfHour,
  parseISO,
  isBefore,
  format,
  subHours
} from 'date-fns';
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class AppointmentController {
  async index(req, res) {
    const PAGE_SIZE = 20;
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: { user_id: req.userId },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancellable'],
      limit: PAGE_SIZE,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['path', 'url', 'id']
            }
          ]
        }
      ]
    });

    return res.json(appointments);
  }

  // CREATE ------------------------------------ ||
  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required()
    });

    if (!(await schema.isValid(req.body))) {
      return res
        .status(400)
        .json({ error: 'Failed validation' });
    }

    const { provider_id, date } = req.body;

    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true }
    });
    // check if provider_id is a provider
    if (!isProvider) {
      return res
        .status(401)
        .json({ error: 'Provider not valid' });
    }
    // check if requirent is same as provider
    if (req.userId === isProvider.id) {
      return res.status(401).json({
        error: 'User and provider must be different'
      });
    }

    // check date availability
    const hourStart = startOfHour(parseISO(date));
    if (isBefore(hourStart, new Date())) {
      return res.json({
        error: 'Past dates not allowed'
      });
    }

    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        cancelled_at: null,
        date: hourStart
      }
    });
    if (checkAvailability) {
      return res.status(401).json({
        error: 'Provider unavailable at requested time'
      });
    }

    // NOTIFY PROVIDER
    const user = await User.findByPk(req.userId);
    const formattedDate = format(
      hourStart,
      "MMMM dd 'at' HH'h'mm"
    );

    await Notification.create({
      content: `Appointment with ${user.name} scheduled on ${formattedDate}`,
      provider: provider_id,
      read: false
    });

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart
    });

    return res.json(appointment);
  }

  // DELETE ------------------------------------ ||
  async delete(req, res) {
    const { id } = req.params;

    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email']
        },
        {
          model: User,
          as: 'user',
          attributes: ['name']
        }
      ]
    });
    if (appointment.user_id !== req.userId) {
      return res
        .status(401)
        .json({ error: 'Unauthorized user' });
    }

    // check if cancelling 2+ hours before
    const limitDate = subHours(appointment.date, 2);
    if (isBefore(limitDate, new Date())) {
      return res.status(401).json({
        error:
          'You can only cancel appointments 2 hours in advance'
      });
    }

    appointment.cancelled_at = new Date();
    await appointment.save();

    Queue.add(CancellationMail.key, {
      appointment
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();
