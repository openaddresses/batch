class CI {
    static event(event) {
        return new Promise((resolve, reject) => {
            console.error(JSON.stringify(event));

            return resolve(true);
        });
    }
}

module.exports = CI;
