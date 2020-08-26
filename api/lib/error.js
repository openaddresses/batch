'use strict';

class PublicError {
    constructor(status, err, safe) {
        console.error(err ? err : 'Error: ' + safe);

        this.status = status;
        this.err = err;
        this.safe = safe;
    }

    static respond(err, res) {
        console.error(err);

        if (err instanceof PublicError) {
            res.status(err.status).json({
                status: err.status,
                message: err.safe
            });
        } else {
            res.status(500).json({
                status: 500,
                message: 'Internal Server Error'
            });
        }
    }
}

module.exports = PublicError;
