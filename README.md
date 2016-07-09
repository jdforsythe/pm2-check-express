# pm2-check-express
Create express endpoints for health check and stats with pm2

# Install

```sh
$ npm install --save pm2-check-express
```

# Usage

```js
const express = require('express');
const app = express();
const pm2CheckRoutes = require('pm2-check-express');

app.use('/', function(req, res, next) {
  //
});

pm2CheckRoutes(app, {
  healthUrl: '/health',
  statsUrl: '/stats',
  timestampFormat: 'MM/DD/YY h:mm:ss a'
});

```

This will expose:

- `/health` route which returns `200` if all processes are online or `500` if **any** process is not online
- `/stats` route which returns a hash of stats:
  
  ```js
  {
    healthy: true, // same as the /health route, but `true/false`
    system: {
      freeMemory: '2048.00MB',
      totalMemory: '4096.00MB',
      usedMemory: '2048.00MB',
      usedMemoryPercent: 50.00,
      cpuPercent: .36
    },
    processes: [
      pid: 12345,
      name: 'server',
      instances: 1,
      status: 'online',
      lastStart: '07/04/2016 7:22 am',
      lastStartAgo: '5 days ago',
      firstStart: '07/01/2016 6:44 pm',
      firstStartAgo: '8 days ago',
      httpLatency: 155,
      loopDelay: {},
      restarts: 1,
      memory: 22,
      cpu: 12
    }
