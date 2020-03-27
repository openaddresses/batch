'use strict';

class PublicError {
    constructor(status, err, safe) {
        console.error(err ? err : 'Error: ' + safe);

        this.status = status;
        this.err = err;
        this.safe = safe;
    }

    static respond(err, res) {
        if (err instanceof PublicError) {
            res.status(this.status).json({
                status: this.status,
                message: this.safe
            });
        } else {
            console.error(err);

            res.status(500).json({
                status: 500,
                message: 'Internal Server Error'
            });
        }
    }
}

module.exports = PublicError;
