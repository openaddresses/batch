import Err from '@openaddresses/batch-error';
import Schedule from '../lib/schedule.js';
import Auth from '../lib/auth.js';
import {
    ScheduleBody,
    StandardResponse
} from '../lib/schema.js';

export default async function router(schema, config) {
    await schema.post('/schedule', {
        name: 'Scheduled Event',
        group: 'Schedule',
        description: 'Internal function to allow scheduled lambdas to kick off events',
        body: ScheduleBody,
        res: StandardResponse
    }, async (req, res) => {
        try {
            await Auth.is_admin(req);

            await Schedule.event(config.pool, req.body);

            return res.json({
                status: 200,
                message: 'Schedule Event Started'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
