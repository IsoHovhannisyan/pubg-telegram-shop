const express = require('express');
const router = express.Router();
const handleFreekassaCallback = require('../services/freekassa');

router.get('/freekassa/callback', handleFreekassaCallback);

module.exports = router;
