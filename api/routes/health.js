export default async function router(schema) {
    schema.get('/health', {
        name: 'Server Healthcheck',
        group: 'Health',
        auth: 'public',
        description: 'AWS ELB Healthcheck',
        res: 'res.Health.json'
    }, (req, res) => {
        return res.json({
            healthy: true,
            message: 'I work all day, I work all night to get the open the data!'
        });
    });
}
