// @flow

import type { Server } from 'restify';

import axios from 'axios';
import config from 'config';

const version = require('../../../package.json').version;

const up = 'UP';
const down = 'DOWN';

export default function IndexResource (server: Server) {
  server.get('/', (req, res, next) => {
    res.send(200, {
      message: 'Hi! Like looking at data? Check out https://github.com/madou/armory-react or https://github.com/madou/armory-back if you want to contribute to Guild Wars 2 Armory!',
    });
    return next();
  });

  server.get('/healthcheck', async (req, res, next) => {
    let fetchAlive;

    try {
      await axios.get(`http://${config.fetch.host}:${config.fetch.port}/healthcheck`);
      fetchAlive = true;
    } catch (e) {
      fetchAlive = false;
    }

    res.send(fetchAlive ? 200 : 500, {
      api: up,
      fetch: fetchAlive ? up : down,
      version: `v${version}`,
    });

    return next();
  });
}
