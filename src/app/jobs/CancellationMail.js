import { format, parseISO } from 'date-fns';
import Mail from '../../lib/Mail';

class CancellationMail {
  get key() {
    return 'CancellationMail';
  }

  async handle({ data }) {
    const { appointment } = data;

    // previously with await -> now controlled in a job line
    await Mail.sendMail({
      to: `${appointment.provider.name} <${appointment.provider.email}>`,
      subject: 'Cancelled appointment',
      template: 'cancellation',
      context: {
        provider: appointment.provider.name,
        user: appointment.user.name,
        date: format(
          // appoint.date comes as string, hence parseISO
          parseISO(appointment.date),
          "MMMM dd 'at' HH'h'mm"
        )
      }
    });
  }
}

export default new CancellationMail();
