const express = require('express')
const app = express()
const port = 3000

let interval;
let value = 0;

app.get('/connection', (req, res) => {
  res.header('content-type', 'text/event-stream');
  res.header('x-accel-buffering', 'no');
  res.header('cache-control', 'no-cache');
  res.header('connection', 'keep-alive');
  interval = setInterval(() => {
    res.write(`id: ${value++}\nevent: info\ndata: { "data": "hello world"}\n\n`);
  }, 1000);
});

app.use(express.static('dist'));

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
