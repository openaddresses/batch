'use strict';

class CI {
    static event(event) {
        return new Promise((resolve) => {
            console.error('EVENT', JSON.stringify(event));

            return resolve(true);
        });
    }
}

module.exports = CI;
