#!/usr/bin/env node

const express = require('express');
const minify = require('express-minify');
const bodyparser = require('body-parser');

const router = express.Router();
const app = express();

app.disable('x-powered-by');
app.use('/api', router);
app.use(minify());


router.use(bodyparser.urlencoded({ extended: true }));
router.use(bodyparser.json());

router.get('sets', (req, res) => {
    return res.json([]);
});

app.listen(5000, (err) => {
    if (err) return err;

    console.log(`Server listening on port 5000`);
});
