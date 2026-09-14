export default {
    dialect: 'postgresql',
    schema: './lib/schema.js',
    dbCredentials: {
        url: process.env.POSTGRES || 'postgres://postgres@localhost:5432/openaddresses'
    },
    verbose: true,
    strict: true,
    out: './migrations'
};
