import {
  ShippoService,
  ServiceOptions,
  ID,
  Params,
  App,
  Data,
  axiosOpts,
  shippoLimiter,
  calcMinTime
} from '../service';

// https://goshippo.com/docs/rate-limits/
const liveMinTimes = {
  create: calcMinTime(50),
  update: calcMinTime(50),
  get: calcMinTime(400),
  find: calcMinTime(50),
  remove: calcMinTime(50)
};

const testMinTimes = {
  create: calcMinTime(5),
  update: calcMinTime(5),
  get: calcMinTime(40),
  find: calcMinTime(5),
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

export class ShippoBatches extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'batches',
      methods: ['get', 'create', 'update', 'patch', 'remove']
    };
    super(options, app);
  }

  _update(id: ID, data: Data, params: Params) {
    return this.schedule('create', () => {
      return this.shippo.post(
        `batches/${id}/add_shipments`,
        data,
        axiosOpts(params)
      );
    });
  }

  _patch(id: ID, data: Data, params: Params) {
    return this.schedule('create', () => {
      return this.shippo.post(
        `batches/${id}/remove_shipments`,
        data,
        axiosOpts(params)
      );
    });
  }

  _remove(id: ID, params: Params) {
    return this.schedule('create', () => {
      return this.shippo.post(`batches/${id}/purchase`, axiosOpts(params));
    });
  }
}
