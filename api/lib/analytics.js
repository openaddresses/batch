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
            if (req.url === '/health') return next();

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
            pgres = await this.pool.query(`
                SELECT
                    a.count,
                    collections.name
                FROM (
                    SELECT
                        Count(*),
                        ((Regexp_Matches(url, '[0-9]+'))[1])::BIGINT AS collection
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
            row.count = parseInt(row.count);
            return row;
        });
    }

    /**
     * Return daily unique visitors (visitor must make at least 2 api calls within session to ensure it's not a curl)
     */
    async traffic() {
        let pgres;
        try {
            pgres = await this.pool.query(`
                SELECT
                    s.x,
                    count(s.y)
                FROM (
                    SELECT
                        ts::DATE AS x,
                        count(*) AS y,
                        sid
                    FROM
                        analytics
                    GROUP BY
                        ts::DATE,
                        sid
                    ) s
                WHERE
                    y > 1
                GROUP BY
                    x
                ORDER BY
                    x DESC
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
