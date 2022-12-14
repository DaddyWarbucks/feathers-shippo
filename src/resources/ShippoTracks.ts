import { BadRequest } from '@feathersjs/errors';
import {
  ShippoService,
  ServiceOptions,
  ID,
  Params,
  App,
  shippoLimiter,
  calcMinTime
} from '../service';

// https://goshippo.com/docs/rate-limits/
const liveMinTimes = {
  create: calcMinTime(500),
  update: calcMinTime(500),
  get: calcMinTime(500),
  find: calcMinTime(500),
  remove: calcMinTime(500)
};

const testMinTimes = {
  create: calcMinTime(50),
  update: calcMinTime(50),
  get: calcMinTime(50),
  find: calcMinTime(50),
  remove: calcMinTime(50)
};

const shippoLimiters = (token: string) => {
  const minTimes = token.startsWith('shippo_live')
    ? liveMinTimes
    : testMinTimes;
  return {
    create: shippoLimiter('create', minTimes),
    update: shippoLimiter('update', minTimes),
    get: shippoLimiter('get', minTimes),
    find: shippoLimiter('find', minTimes),
    remove: shippoLimiter('remove', minTimes)
  };
};

interface TracksParams extends Params {
  query: {
    carrier: string;
  };
}

export class ShippoTracks extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'tracks',
      methods: ['get', 'create']
    };
    super(options, app);
  }

  _get(id: ID, params: TracksParams) {
    if (!params?.query?.carrier) {
      throw new BadRequest('params.query.carrier is required');
    }
    const shippoParams = { ...params, query: { ...params.query } } as any;
    const carrier = shippoParams.query.carrier;
    delete shippoParams.query.carrier;
    return this.resource
      .get(`${carrier}/${id}`, shippoParams)
      .then(this.handleResult)
      .catch(this.handleError);
  }
}
