'use strict';

/**
 * @class Analytics
 */
class Analytics {
    constructor(pool) {
        this.pool = pool;

        return (req, res, next) => {
            const point = {
                sid: req.sessionID || 'unknown',
                ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
                url: req.url,
                method: req.method,
                agent: req.headers['user-agent'] || 'unknown'
            };

            this.point(point);
            return next();
        };
    }

    point(params) {
        this.pool.query(`
            INSERT INTO analytics (
                ts,
                sid,
                ip,
                url,
                method,
                agent
            ) VALUES (
                NOW(),
                MD5($1),
                $2,
                $3,
                $4,
                $5
            );
        `, [
            params.sid,
            params.ip,
            params.url,
            params.method,
            params.agent
        ]);
    }
}

module.exports = Analytics;
