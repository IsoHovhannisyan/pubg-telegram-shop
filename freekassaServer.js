require('dotenv').config();
const express = require('express');
const app = express();

const freekassaRouter = require('./bot/routes/freekassa'); // ✅ ուղին ըստ քո կառուցվածքի

app.use(express.json());
app.use('/', freekassaRouter); // ցանկացած route (օր․ /freekassa/callback)

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Express server is running on port ${PORT}`);
});

