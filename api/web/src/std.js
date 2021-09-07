function std() {

    /**
     * @param {String} url
     * @param {Object} opts
     * @param {Object} opts.headers
     * @Param {Object} opts.body
     */
    window.std = async function(url, opts = {}, redirect = true) {
        try {
            url = new URL(url);
        } catch (err) {
            url = new URL(url, window.location.origin);
        }

        try {
            if (!opts.headers) opts.headers = {};

            if (typeof opts.body === 'object' && !opts.headers['Content-Type']) {
                opts.body = JSON.stringify(opts.body);
                opts.headers['Content-Type'] = 'application/json';
            }

            if (localStorage.token && !opts.headers.Authorization) {
                opts.headers['Authorization'] = 'Bearer ' + localStorage.token;
            }

            const res = await fetch(url, opts);

            let bdy = {};
            if ((res.status < 200 || res.status >= 400) && ![401].includes(res.status)) {
                try {
                    bdy = await res.json();
                } catch (err) {
                    throw new Error(`Status Code: ${res.status}`);
                }

                if (bdy.message) throw new Error(bdy.message);
                else throw new Error(`Status Code: ${res.status}`);
            } else if (!redirect && res.status === 401) {
                window.location = '/login';
            }

            return await res.json();
        } catch (err) {
            throw new Error(err.message);
        }
    }
}

export default std;
