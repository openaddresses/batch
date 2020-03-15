INSERT INTO runs (
    created,
    github,
    closed
) VALUES (
    NOW(),
    '{}'::JSONB,
    true
);

INSERT INTO job (
    run,
    created,
    source,
    layer,
    name,
    output,
    loglink,
    status,
    version
) VALUES (
    1,
    NOW(),
    'https://raw.githubusercontent.com/openaddresses/openaddresses/a807875e0cbf6fdadc2ae06428f93462f860ad06/sources/us/tn/city_of_nashville.json',
    'addresses',
    'city-of-nashville',
    NULL,
    NULL,
    'Pending',
    '0.0.0'
);
