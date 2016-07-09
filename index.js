'use strict';

const pm2 = require('pm2');
const moment = require('moment');
const os = require('os');
const cpuPercent = require('cpu-pct');

/**
 * Add routes to Express to check pm2 process and system health
 *
 * @param {Express} expressApp - an instance of express()
 * @param {Object} opts - the options
 * @param {string} [opts.healthUrl="/health"] - the URL endpoint for quick health status
 * @param {string} [opts.statusUrl="/stats"] - the URL endpoint for full statistics
 * @param {string} [opts.timestampFormat="MM/DD/YY h:mm:ss a"] - momentjs timestamp string to use for uptime output
 */
module.exports = function(expressApp, opts) {
  if (!opts)
    opts = {};

  /**
   * /health
   *
   * returns 200 if all processes online, 500 if pm2 is down or any process is down
   */
  expressApp.get(opts.healthUrl || '/health', function(req, res) {
    pm2.connect(function(connErr) {
      if (connErr) {
        res.sentStatus(500);
        return;
      }

      pm2.list(function(listErr, processes) {
        pm2.disconnect();

        if (listErr) {
          res.sendStatus(500);
          return;
        }

        const ok = processes.every((process) => {
          return process.pm2_env.status === 'online';
        });

        res.sendStatus(ok ? 200 : 500);
      });
    });
  });


  /**
   * /stats
   *
   * returns a JSON representation of process statistics
   */
  expressApp.get(opts.statsUrl || '/stats', function(req, res) {
    pm2.connect(function(connErr) {
      if (connErr) {
        res.sendStatus(500);
        return;
      }

      pm2.list(function(listErr, processes) {
        pm2.disconnect();

        if (listErr || !processes || !processes.length) {
          res.sendStatus(500);
          return;
        }

        let okay = true;

        const pcs = processes.map((p) => {
          // don't bother checking if we've already found an offline process
          if (okay && p.pm2_env.status !== 'online')
            okay = false;

          return {
            pid: p.pid,
            name: p.name,
            instances: p.pm2_env.instances,
            status: p.pm2_env.status,
            lastStart: _getTimestamp(p.pm2_env.pm_uptime, opts.timestampFormat || 'MM/DD/YY h:mm:ss a'),
            lastStartAgo: _getSince(p.pm2_env.pm_uptime),
            firstStart: _getTimestamp(p.pm2_env.created_at, opts.timestampFormat || 'MM/DD/YY h:mm:ss a'),
            firstStartAgo: _getSince(p.pm2_env.created_at),
            httpLatency: p.pm2_env.axm_options.http_latency,
            loopDelay: p.pm2_env.axm_monitor['Loop delay'],
            unstable_restarts: p.pm2_env.unstable_restarts,
            memory: p.monit.memory,
            cpu: p.monit.cpu,
          };
        });

        // system stats
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const usedMem = totalMem - freeMem;

        const system = {
          freeMemory: _getMegabytesFromBytes(freeMem),
          totalMemory: _getMegabytesFromBytes(totalMem),
          usedMemory: _getMegabytesFromBytes(usedMem),
          usedMemoryPercent: _getPercentage(usedMem / totalMem, 2),
        };

        cpuPercent({
          interval: 100,
          returnType: 'fraction',
          decimals: 2,
        }, function(pct) {
          system.cpuPercent = _getPercentage(pct, 2);

          res.json({
            healthy: okay,
            processes: pcs,
            system: system,
          });
        });
      });
    });
  });
};

function _getPercentage(fraction, digits) {
  const num = fraction * 100;
  return Number((Math.round(num + 'e+' + digits) + 'e-' + digits)).toFixed(digits);
}

function _getMegabytesFromBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + 'MB';
}

function _getTimestamp(uglyDate, format) {
  return moment(uglyDate).format(format);
}

function _getSince(epochMilliseconds) {
  return moment(epochMilliseconds).fromNow();
}
