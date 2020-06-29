'use strict';

const Err = require('./error');

/**
 * @class Analytics
 */
class Analytics {
    constructor(pool) {
        this.pool = pool;
    }

    middleware() {
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

    /**
     * Get most popular collections
     */
    async collections() {
        let pgres;
        try {
        console.error('HERE');
            pgres = await this.pool.query(`
                SELECT 
                    a.count, 
                    collections.name
                FROM (
                    SELECT
                        Count(*),
                        ((Regexp_Matches(url, '\d+'))[1])::BIGINT AS collection
                    FROM
                        analytics
                    WHERE
                        url iLIKE '%collections/%'
                    GROUP BY
                        url
                    ORDER BY
                        Count(*)
                ) a INNER JOIN collections
                    ON a.collection = collections.id
            `, []);
        } catch (err) {
            throw new Err(500, err, 'failed to retrieve collections');
        }

        return pgres.rows.map((row) => {
            console.error(row);
            row.count = parseInt(row.count);
        });
    }

    /**
     * Return daily unique visitors
     */
    async traffic() {
        let pgres;
        try {
            pgres = await this.pool.query(`
                SELECT
                    ts::DATE AS x,
                    count(*) AS y
                FROM
                    analytics
                GROUP BY
                    ts::DATE
                ORDER BY
                    ts::DATE DESC
            `, []);
        } catch (err) {
            throw new Err(500, err, 'failed to retrieve traffic');
        }

        return {
            datasets: [{
                label: 'Unique Daily Sessions',
                data: pgres.rows.map((row) => {
                    row.y = parseInt(row.y);
                    return row;
                })
            }]
        };
    }
}

module.exports = Analytics;
