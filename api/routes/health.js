import {
    HealthResponse
} from '../lib/schema.js';

export default async function router(schema) {
    schema.get('/health', {
        name: 'Server Healthcheck',
        group: 'Health',
        description: 'AWS ELB Healthcheck',
        res: HealthResponse
    }, (req, res) => {
        return res.json({
            healthy: true,
            message: 'I work all day, I work all night to get the open the data!'
        });
    });
}
