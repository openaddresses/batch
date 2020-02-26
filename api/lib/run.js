class Run {
    constructor() {
        this.id = false;
        this.created = false;
        this.github = {};
        this.closed = false;
    }

    /**
     * Return all associated jobs for a given run
     */
    static jobs(pool, id) {

    }

    static from(pool, id, cb) {
        pool.query(`
            SELECT
                *
            FROM
                runs
            WHERE
                id = $1
        `, (err, pgres) => {
            if (err) return cb(err);

            const run = new Run();

            for (const key of Object.keys(pgres.rows[0])) {
                run[key] = pgres.rows[0][key];
            }

            return cb(null, run);
        });
    }

    json(cb) {
        return {
            id: this.id,
            created: this.created,
            github: this.github,
            closed: this.closed
        };
    }

    generate(pool, cb) {
        pool.query(`
            INSERT INTO runs (
                id,
                created,
                github,
                closed
            ) VALUES (
                uuid_generate_v4(),
                NOW(),
                '{}'::JSONB,
                false
            ) RETURNING *
        `, (err, pgres) => {
            if (err) throw err;

            for (const key of Object.keys(pgres.rows[0])) {
                run[key] = pgres.rows[0][key];
            }
        });
    }
}

module.exports = Run;
