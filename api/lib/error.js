class PublicError {
    constructor(status, err, safe) {
        console.error(err ? err : 'Error: ' + safe);

        this.status = status;
        this.err = err;
        this.safe = safe;
    }

    res(res) {
        res.status(this.status).json({
            status: this.status,
            message: this.safe
        });
    }
}

module.exports = PublicError;
