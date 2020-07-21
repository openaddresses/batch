class Run {
    static async get(api, id) {
        return new Promise((resolve, reject) => {
            request({
                url: `${api}/api/run/${id}`,
                json: true,
                method: 'GET'
            }, (err, res) => {
                if (err) return reject(err);

                return resolve(res.body);
            });
        });

    }
}

module.exports = Run;
