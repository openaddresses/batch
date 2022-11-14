import test from 'tape';
import Validator from '../lib/validator.js';

test('Valid Feature', (t) => {
    const validator = new Validator('addresses');
    validator.test({
        type: 'Feature',
        properties: {
            number: '123',
            street: 'Main Street'
        },
        geometry: {
            type: 'Point',
            coordinates: [13.43232, 43.43245]
        }
    });

    t.deepEquals(validator.stats, {
        valid: 1,
        failures: {
            geometry: 0,
            number: 0,
            street: 0
        }
    }, 'expected stats');

    t.end();
});

test('Missing Number', (t) => {
    const validator = new Validator('addresses');

    validator.test({
        type: 'Feature',
        properties: {
            street: 'main street'
        },
        geometry: {
            type: 'Point',
            coordinates: [13.43232, 43.43245]
        }
    });

    t.deepEquals(validator.stats, {
        valid: 0,
        failures: {
            geometry: 0,
            number: 1,
            street: 0
        }
    }, 'expected stats');

    t.end();
});

test('Empty Number', (t) => {
    const validator = new Validator('addresses');

    validator.test({
        type: 'Feature',
        properties: {
            number: '',
            street: 'main street'
        },
        geometry: {
            type: 'Point',
            coordinates: [13.43232, 43.43245]
        }
    });

    t.deepEquals(validator.stats, {
        valid: 0,
        failures: {
            geometry: 0,
            number: 1,
            street: 0
        }
    }, 'expected stats');

    t.end();
});

test('Whitespace Number', (t) => {
    const validator = new Validator('addresses');

    validator.test({
        type: 'Feature',
        properties: {
            number: ' \t ',
            street: 'Main Street'
        },
        geometry: {
            type: 'Point',
            coordinates: [13.43232, 43.43245]
        }
    });

    t.deepEquals(validator.stats, {
        valid: 0,
        failures: {
            geometry: 0,
            number: 1,
            street: 0
        }
    }, 'expected stats');

    t.end();
});

test('Too Large Number', (t) => {
    const validator = new Validator('addresses');

    validator.test({
        type: 'Feature',
        properties: {
            number: '12345678901',
            street: 'Main Street'
        },
        geometry: {
            type: 'Point',
            coordinates: [13.43232, 43.43245]
        }
    });

    t.deepEquals(validator.stats, {
        valid: 0,
        failures: {
            geometry: 0,
            number: 1,
            street: 0
        }
    }, 'expected stats');

    t.end();
});

test('Missing Street', (t) => {
    const validator = new Validator('addresses');

    validator.test({
        type: 'Feature',
        properties: {
            number: '123'
        },
        geometry: {
            type: 'Point',
            coordinates: [13.43232, 43.43245]
        }
    });

    t.deepEquals(validator.stats, {
        valid: 0,
        failures: {
            geometry: 0,
            number: 0,
            street: 1
        }
    }, 'expected stats');

    t.end();
});

test('Empty Street', (t) => {
    const validator = new Validator('addresses');

    validator.test({
        type: 'Feature',
        properties: {
            number: '123',
            street: ''
        },
        geometry: {
            type: 'Point',
            coordinates: [13.43232, 43.43245]
        }
    });

    t.deepEquals(validator.stats, {
        valid: 0,
        failures: {
            geometry: 0,
            number: 0,
            street: 1
        }
    }, 'expected stats');

    t.end();
});

test('Invalid Coords - No Geom', (t) => {
    const validator = new Validator('addresses');

    validator.test({
        type: 'Feature',
        properties: {
            number: '123',
            street: 'Main St'
        },
        geometry: false
    });

    t.deepEquals(validator.stats, {
        valid: 0,
        failures: {
            geometry: 1,
            number: 0,
            street: 0
        }
    }, 'expected stats');

    t.end();
});
test('Invalid Coords - Lng', (t) => {
    const validator = new Validator('addresses');

    validator.test({
        type: 'Feature',
        properties: {
            number: '123',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [-181, 43.43245]
        }
    });

    t.deepEquals(validator.stats, {
        valid: 0,
        failures: {
            geometry: 1,
            number: 0,
            street: 0
        }
    }, 'expected stats');

    t.end();
});

test('Invalid Coords - Lat', (t) => {
    const validator = new Validator('addresses');

    validator.test({
        type: 'Feature',
        properties: {
            number: '123',
            street: 'Main St'
        },
        geometry: {
            type: 'Point',
            coordinates: [-180, -91]
        }
    });

    t.deepEquals(validator.stats, {
        valid: 0,
        failures: {
            geometry: 1,
            number: 0,
            street: 0
        }
    }, 'expected stats');

    t.end();
});

test('Multi Features', (t) => {
    const validator = new Validator('addresses');

    validator.test({
        type: 'Feature',
        properties: {
            number: '123',
            street: 'Main Street'
        },
        geometry: {
            type: 'Point',
            coordinates: [13.43232, 43.43245]
        }
    });

    validator.test({
        type: 'Feature',
        properties: {
            number: '123',
            street: ''
        },
        geometry: {
            type: 'Point',
            coordinates: [13.43232, 43.43245]
        }
    });

    validator.test({
        type: 'Feature',
        properties: {
            number: '456',
            street: 'Maple Street'
        },
        geometry: {
            type: 'Point',
            coordinates: [13.43232, 43.43245]
        }
    });

    t.deepEquals(validator.stats, {
        valid: 2,
        failures: {
            geometry: 0,
            number: 0,
            street: 1
        }
    });

    t.end();
});
