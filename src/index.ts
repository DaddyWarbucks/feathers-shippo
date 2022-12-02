import { GeneralError, MethodNotAllowed } from '@feathersjs/errors';
import Bottleneck from 'bottleneck';
import shippo from 'shippo';
import { Application } from '@feathersjs/feathers';

interface ServiceOptions {
  shippoKey: string;
  resource: string;
  limiters?: false | {
    create: any
    update: any
    get: any
    find: any
  },
};

type ID = string;

interface Data { [key: string]: any; }[];

interface Params {
  [key: string]: any;
  query: {
    [key: string]: any;
    results?: number | undefined;
    page?: number | undefined;
  }
}

interface PaginatedResult {
  count: `${number}`;
  next: string | null;
  previous: string | null;
  data: [];
};

interface Result {
  [key: string]: any;
};


// https://goshippo.com/docs/rate-limits/
const calcMinTime = (perMinute: number) => 60000 / perMinute;

const minTimes = {
  test: {
    default: {
      create: calcMinTime(50),
      update: calcMinTime(50),
      get: calcMinTime(400),
      find: calcMinTime(5)
    },
    batch: {
      create: calcMinTime(5),
      update: calcMinTime(5),
      get: calcMinTime(40),
      find: calcMinTime(5)
    },
    track: {
      create: calcMinTime(50),
      update: calcMinTime(50),
      get: calcMinTime(50),
      find: calcMinTime(50)
    }
  },
  live: {
    default: {
      create: calcMinTime(500),
      update: calcMinTime(500),
      get: calcMinTime(4000),
      find: calcMinTime(50)
    },
    batch: {
      create: calcMinTime(50),
      update: calcMinTime(50),
      get: calcMinTime(400),
      find: calcMinTime(50)
    },
    track: {
      create: calcMinTime(500),
      update: calcMinTime(500),
      get: calcMinTime(500),
      find: calcMinTime(500)
    }
  }
} as any;

const shippoLimiter = (mode: string, resource: string, method: string) => {
  resource = ['batch', 'track'].includes(resource) ? resource : 'default';
  const minTime = minTimes[mode][resource][method];
  const limiter = new Bottleneck({ minTime });

  limiter.on('failed', async (error, jobInfo) => {
    if (error.code === 429 && jobInfo.retryCount === 0) {
      // Retry once after 200ms
      return 200;
    }
  });

  return limiter;
};

const objectHas = (object: object, key: string) => {
  return Object.prototype.hasOwnProperty.call(object, key);
};

export class ShippoService {
  options: ServiceOptions;
  app: Application;
  shippoClient: any;
  resource: any;

  constructor(options: ServiceOptions, app: Application) {
    this.options = options;
    this.app = app;

    const { shippoKey, resource } = options;

    if (!shippoKey) {
      throw new GeneralError(
        'options.shippoKey is required for new ShippoService()'
      );
    }

    if (!resource || objectHas(shippo, resource)) {
      throw new GeneralError(
        `${resource} is invalid options.resource for new ShippoService()`
      );
    }

    this.shippoClient = shippo(shippoKey);
    this.resource = this.shippoClient[resource];

    if (!objectHas(this.options, 'limiters')) {
      const mode = shippoKey.startsWith('shippo_live') ? 'live' : 'test';
      this.options.limiters = {
        create: shippoLimiter(mode, resource, 'create'),
        update: shippoLimiter(mode, resource, 'update'),
        get: shippoLimiter(mode, resource, 'get'),
        find: shippoLimiter(mode, resource, 'find')
      };
    }
  }

  _handleError(error: any) {
    return error;
    // TODO: Inspect the error and throw more specific
    // feathers errors.
    // if (error.code === 429) {
    //   throw new TooManyRequests(error);
    // }
    // throw new BadRequest(error);
  }

  schedule(method: 'create' | 'update' | 'get' | 'find', fn: Function) {
    if (this.options.limiters && this.options.limiters[method]) {
      return this.options.limiters[method].schedule(fn);
    }
    return fn();
  }

  _create(data: Data, params?: Params): Promise<Result> {
    if (!this.resource.operations.includes('create')) {
      throw new MethodNotAllowed();
    }
    return this.schedule('create', () =>
      this.resource.create(data).catch(this._handleError)
    );
  }

  create(data: Data, params?: Params): Promise<Result> {
    return this._create(data, params);
  }

  _get(id: ID, params?: Params): Promise<Result> {
    if (!this.resource.operations.includes('retrieve')) {
      throw new MethodNotAllowed();
    }
    return this.schedule('get', () =>
      this.resource.retrieve(id).catch(this._handleError)
    );
  }

  get(id: ID, params?: Params): Promise<Result> {
    return this._get(id, params);
  }

  _find(params?: Params): Promise<PaginatedResult> {
    if (!this.resource.operations.includes('list')) {
      throw new MethodNotAllowed();
    }
    const find = async (params?: Params) => {
      const result = await this.resource.list(params?.query);
      result.data = result.results;
      delete result.results;
      return result;
    };
    return this.schedule('find', () => find(params).catch(this._handleError));
  }

  find(params?: Params): Promise<PaginatedResult> {
    return this._find(params);
  }

  _update(id: ID, data: Data, params?: Params): Promise<Result> {
    if (!this.resource.operations.includes('update')) {
      throw new MethodNotAllowed();
    }
    return this.schedule('update', () =>
      this.resource.update(id, data).catch(this._handleError)
    );
  }

  update(id: ID, data: Data, params?: Params): Promise<Result> {
    return this._update(id, data, params);
  }
}

export class ShippoBatchService extends ShippoService {
  constructor(options: ServiceOptions, app: Application) {
    options = { ...options, resource: 'batch' };
    super(options, app);
  }

  // get(id: string: ID, params?: Params) {
  //   const query = params.query || {};
  //   const args = [id];
  //   args.push(query.page);
  //   args.push(query.object_results);
  //   return this._schedule('get', () => {
  //     this.resource.retrieve(args).catch(this._handleError);
  //   });
  // }

  addShipments(id: ID, data: Data): Promise<Result> {
    return this.schedule('create', () =>
      this.resource.add(id, data).catch(this._handleError)
    );
  }

  removeShipments(id: ID, data: Data): Promise<Result> {
    return this.schedule('create', () =>
      this.resource.remove(id, data).catch(this._handleError)
    );
  }

  purchase(id: ID): Promise<Result> {
    return this.schedule('create', () =>
      this.resource.purchase(id).catch(this._handleError)
    );
  }
}

class ShippoTrackService extends ShippoService {
  constructor(options: ServiceOptions, app: Application) {
    super(options, app);
  }

  // addShipments(id, data) {
  //   return this._schedule('create', () =>
  //     this.resource.add(id, data).catch(this._handleError)
  //   );
  // }

  // removeShipments(id, data) {
  //   return this._schedule('create', () =>
  //     this.resource.remove(id, data).catch(this._handleError)
  //   );
  // }

  // purchase(id) {
  //   return this._schedule('create', () =>
  //     this.resource.purchase(id).catch(this._handleError)
  //   );
  // }
}