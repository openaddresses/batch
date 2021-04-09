'use strict';

const test = require('tape');
const Job = require('../lib/job');

test('Count: 10% Reduction', async (t) => {
    const job = new Job(true, 1);
    job.layer = 'addresses';

    let job_update = false;
    job.update = async (body) => {
        job_update = body;
    };

    const job_err = [];
    job.oa = {
        cmd: async (cmd, subcmd, body) => {
            job_err.push(body);
        }
    };

    await job.check_stats({ live : true }, {
        compare: {
            count: 90,
            stats: {
                counts: { },
                validity: {}
            }
        },
        master: {
            count: 100,
            stats: {
                counts: { },
                validity: {}
            }
        }
    });

    t.deepEquals(job_update, {
        status: 'Warn'
    }, 'job.status: Warn');
    t.deepEquals(job_err, [{
        job: 1,
        message: 'Feature count dropped by 10'
    }], 'joberror: Feature count dropped by 10');
    t.end();
});

test('Count: 9% Reduction', async (t) => {
    const job = new Job(true, 1);
    job.layer = 'addresses';

    let job_update = false;
    job.update = async (body) => {
        job_update = body;
    };

    const job_err = [];
    job.oa = {
        cmd: async (cmd, subcmd, body) => {
            job_err.push(body);
        }
    };

    await job.check_stats({ live : true }, {
        compare: {
            count: 91,
            stats: {
                counts: {},
                validity: {}
            }
        },
        master: {
            count: 100,
            stats: {
                counts: {},
                validity: {}
            }
        }
    });

    t.deepEquals(job_update, false);
    t.deepEquals(job_err, []);
    t.end();
});

test('Address Count: 10% Reduction', async (t) => {
    const job = new Job(true, 1);
    job.layer = 'addresses';

    let job_update = false;
    job.update = async (body) => {
        job_update = body;
    };

    const job_err = [];
    job.oa = {
        cmd: async (cmd, subcmd, body) => {
            job_err.push(body);
        }
    };

    await job.check_stats({ live : true }, {
        compare: {
            count: 91,
            stats: {
                counts: {
                    number: 90
                },
                validity: {}
            }
        },
        master: {
            count: 100,
            stats: {
                counts: {
                    number: 100
                },
                validity: {}
            }
        }
    });

    t.deepEquals(job_update, {
        status: 'Warn'
    }, 'job.status: Warn');

    t.deepEquals(job_err, [{
        job: 1,
        message: '"number" prop dropped by 10'
    }], 'joberror: "number" prop dropped by 10');

    t.end();
});

test('Address Count: 9% Reduction', async (t) => {
    const job = new Job(true, 1);
    job.layer = 'addresses';

    let job_update = false;
    job.update = async (body) => {
        job_update = body;
    };

    const job_err = [];
    job.oa = {
        cmd: async (cmd, subcmd, body) => {
            job_err.push(body);
        }
    };

    await job.check_stats({ live : true }, {
        compare: {
            count: 91,
            stats: {
                counts: {
                    number: 91
                },
                validity: {}
            }
        },
        master: {
            count: 100,
            stats: {
                counts: {
                    number: 100
                },
                validity: {}
            }
        }
    });

    t.deepEquals(job_update, false);
    t.deepEquals(job_err, []);

    t.end();
});

test('Street Count: 10% Reduction', async (t) => {
    const job = new Job(true, 1);
    job.layer = 'addresses';

    let job_update = false;
    job.update = async (body) => {
        job_update = body;
    };

    const job_err = [];
    job.oa = {
        cmd: async (cmd, subcmd, body) => {
            job_err.push(body);
        }
    };

    await job.check_stats({ live : true }, {
        compare: {
            count: 91,
            stats: {
                counts: {
                    number: 100,
                    street: 90
                },
                validity: {}
            }
        },
        master: {
            count: 100,
            stats: {
                counts: {
                    number: 100,
                    street: 100
                },
                validity: {}
            }
        }
    });

    t.deepEquals(job_update, {
        status: 'Warn'
    }, 'job.status: Warn');

    t.deepEquals(job_err, [{
        job: 1,
        message: '"street" prop dropped by 10'
    }], 'joberror: "street" prop dropped by 10');

    t.end();
});

test('Street Count: 9% Reduction', async (t) => {
    const job = new Job(true, 1);
    job.layer = 'addresses';

    let job_update = false;
    job.update = async (body) => {
        job_update = body;
    };

    const job_err = [];
    job.oa = {
        cmd: async (cmd, subcmd, body) => {
            job_err.push(body);
        }
    };

    await job.check_stats({ live : true }, {
        compare: {
            count: 91,
            stats: {
                counts: {
                    number: 100,
                    street: 91
                },
                validity: {}
            }
        },
        master: {
            count: 100,
            stats: {
                counts: {
                    number: 100,
                    street: 100
                },
                validity: {}
            }
        }
    });

    t.deepEquals(job_update, false);
    t.deepEquals(job_err, []);

    t.end();
});

test('Address Count: No Addresses', async (t) => {
    const job = new Job(true, 1);
    job.layer = 'addresses';

    let job_update = false;
    job.update = async (body) => {
        job_update = body;
    };

    const job_err = [];
    job.oa = {
        cmd: async (cmd, subcmd, body) => {
            job_err.push(body);
        }
    };

    await job.check_stats({ live : true }, {
        compare: {
            count: 91,
            stats: {
                counts: {
                    number: 0,
                    street: 91
                },
                validity: {}
            }
        },
        master: {
            count: 100,
            stats: {
                counts: {
                    number: 100,
                    street: 100
                },
                validity: {}
            }
        }
    });

    t.deepEquals(job_update, { status: 'Warn' });
    t.deepEquals(job_err, [
        { job: 1, message: '"number" prop dropped by 100' },
        { job: 1, message: 'Number fields are all empty' }
    ]);

    t.end();
});

test('Address Count: No Streets', async (t) => {
    const job = new Job(true, 1);
    job.layer = 'addresses';

    let job_update = false;
    job.update = async (body) => {
        job_update = body;
    };

    const job_err = [];
    job.oa = {
        cmd: async (cmd, subcmd, body) => {
            job_err.push(body);
        }
    };

    await job.check_stats({ live : true }, {
        compare: {
            count: 91,
            stats: {
                counts: {
                    number: 0,
                    street: 0
                },
                validity: {}
            }
        },
        master: {
            count: 100,
            stats: {
                counts: {
                    number: 100,
                    street: 100
                },
                validity: {}
            }
        }
    });

    t.deepEquals(job_update, { status: 'Warn' });
    t.deepEquals(job_err, [
        { job: 1, message: '"number" prop dropped by 100' },
        { job: 1, message: '"street" prop dropped by 100' },
        { job: 1, message: 'Number fields are all empty' },
        { job: 1, message: 'Street fields are all empty' }
    ]);

    t.end();
});

test('Address Count: No Valid Addresses', async (t) => {
    const job = new Job(true, 1);
    job.layer = 'addresses';

    let job_update = false;
    job.update = async (body) => {
        job_update = body;
    };

    const job_err = [];
    job.oa = {
        cmd: async (cmd, subcmd, body) => {
            job_err.push(body);
        }
    };

    await job.check_stats({ live : true }, {
        compare: {
            count: 91,
            stats: {
                counts: {
                    number: 0,
                    street: 0
                },
                validity: {
                    valid: 0
                }
            }
        },
        master: {
            count: 100,
            stats: {
                counts: {
                    number: 100,
                    street: 100
                }
            }
        }
    });

    t.deepEquals(job_update, { status: 'Warn' });
    t.deepEquals(job_err, [
        { job: 1, message: '"number" prop dropped by 100' },
        { job: 1, message: '"street" prop dropped by 100' },
        { job: 1, message: 'Number fields are all empty' },
        { job: 1, message: 'Street fields are all empty' },
        { job: 1, message: 'No Valid Address Features' }
    ]);

    t.end();
});
