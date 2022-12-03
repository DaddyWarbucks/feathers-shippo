import * as errors from '@feathersjs/errors';
import Bottleneck from 'bottleneck';
import { Application } from '@feathersjs/feathers';
import axios, { AxiosInstance } from 'axios';

const SHIPPO_API_URL = 'https://api.goshippo.com';

export type App = Application;

export interface Limiters {
  create: Bottleneck;
  update: Bottleneck;
  get: Bottleneck;
  find: Bottleneck;
  remove: Bottleneck;
}

export interface Resource {
  create: (data: Data, params?: Params) => Promise<any>;
  update: (id: ID, data: Data, params?: Params) => Promise<any>;
  get: (id: ID, params?: Params) => Promise<any>;
  find: (params?: Params) => Promise<any>;
  remove: (id: ID, params?: Params) => Promise<any>;
}

export interface ServiceOptions {
  token: string;
  path: string;
  methods: Array<ServiceMethod>;
  limiters?: false | Limiters;
}

export type ServiceMethod =
  | 'create'
  | 'get'
  | 'find'
  | 'update'
  | 'patch'
  | 'remove';

export type ID = string;

export interface Data {
  [key: string]: any;
}
[];

export interface Params {
  [key: string]: any;
  query?: {
    [key: string]: any;
    results?: number | undefined;
    page?: number | undefined;
  };
  shippo?: {
    [key: string]: any;
  };
}

export interface PaginatedResult {
  count: `${number}`;
  next: string | null;
  previous: string | null;
  data: [];
}

export interface Result {
  [key: string]: any;
}

export const calcMinTime = (perMinute: number) => 60000 / perMinute;

// https://goshippo.com/docs/rate-limits/
const liveMinTimes = {
  create: calcMinTime(500),
  update: calcMinTime(500),
  get: calcMinTime(4000),
  find: calcMinTime(50),
  remove: calcMinTime(500)
};

const testMinTimes = {
  create: calcMinTime(50),
  update: calcMinTime(50),
  get: calcMinTime(400),
  find: calcMinTime(5),
  remove: calcMinTime(50)
};

// const minTimes = {
//   test: {
//     batch: {
//       post: calcMinTime(5),
//       put: calcMinTime(5),
//       retrieve: calcMinTime(40),
//       list: calcMinTime(5)
//     },
//     track: {
//       post: calcMinTime(50),
//       put: calcMinTime(50),
//       retrieve: calcMinTime(50),
//       list: calcMinTime(50)
//     }
//   },
//   live: {
//     batch: {
//       post: calcMinTime(50),
//       put: calcMinTime(50),
//       retrieve: calcMinTime(400),
//       list: calcMinTime(50)
//     },
//     track: {
//       post: calcMinTime(500),
//       put: calcMinTime(500),
//       retrieve: calcMinTime(500),
//       list: calcMinTime(500)
//     }
//   }
// } as any;

export const shippoLimiter = (method: ServiceMethod, minTimes: any) => {
  const limiter = new Bottleneck({ minTime: (minTimes as any)[method] });

  limiter.on('failed', async (error, jobInfo) => {
    if (error.code === 429 && jobInfo.retryCount === 0) {
      // Retry once after 200ms
      return 200;
    }
  });

  return limiter;
};

export const shippoLimiters = (token: string) => {
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

export const axiosOpts = (params?: Params) => {
  return {
    params: params?.query,
    ...params?.shippo
  };
};

const shippoResource = (service: any): Resource => {
  const { path } = service.options;
  return {
    create: (data: Data, params?: Params) => {
      return service.schedule('post', () => {
        return service.shippo.post(path, data, axiosOpts(params));
      });
    },
    update: (id: ID, data: Data, params?: Params) => {
      return service.schedule('put', () => {
        if (!id) {
          throw new errors.BadRequest('ID is required');
        }
        return service.shippo.put(`${path}/${id}`, data, axiosOpts(params));
      });
    },
    get: (id: ID, params?: Params) => {
      return service.schedule('retrieve', () => {
        if (!id) {
          throw new errors.BadRequest('ID is required');
        }
        return service.shippo.get(`${path}/${id}`, axiosOpts(params));
      });
    },
    find: (params?: Params) => {
      return service.schedule('list', () => {
        return service.shippo.get(path, axiosOpts(params));
      });
    },
    remove: (id: ID, params?: Params) => {
      return service.schedule('remove', () => {
        return service.shippo.delete(`${path}/${id}`, axiosOpts(params));
      });
    }
  };
};

export const shippo = (token: string) => {
  return axios.create({
    baseURL: SHIPPO_API_URL,
    headers: { Authorization: `ShippoToken ${token}` }
  });
};

export class ShippoService {
  options: ServiceOptions;
  app: App;
  shippo: AxiosInstance;
  resource: Resource;

  constructor(options: ServiceOptions, app: App) {
    this.options = options;
    this.app = app;

    const { token, path } = options;

    if (!token) {
      throw new errors.GeneralError(
        'options.token is required a Shippo API Token for new ShippoService()'
      );
    }

    if (!path) {
      throw new errors.GeneralError(
        `${path} is invalid options.path for new ShippoService()`
      );
    }

    this.shippo = shippo(token);
    this.resource = shippoResource(this);
  }

  handleError(error: any, params?: Params) {
    if (params) {
      params.shippoError = error;
    }
    if (!error.response) {
      throw error;
    }
    const FeathersError = (errors as any)[error.response.status];
    if (FeathersError) {
      throw new FeathersError(error.message, error.response.data);
    }
    throw new errors.BadRequest(error.message || error, error);
  }

  handleMethod(method: ServiceMethod) {
    const { methods, path } = this.options;
    if (!methods.includes(method)) {
      throw new errors.NotImplemented(
        `"${method}" not implemented on "${path}" ShippoService`
      );
    }
  }

  schedule(
    method: 'create' | 'update' | 'get' | 'find',
    fn: () => Promise<any>
  ) {
    const { limiters } = this.options;
    if (limiters && limiters[method]) {
      return limiters[method].schedule(fn);
    }
    return fn();
  }

  async _create(data: Data, params?: Params): Promise<Result> {
    this.handleMethod('create');
    return this.resource.create(data, params).catch(this.handleError);
  }

  async create(data: Data, params?: Params): Promise<Result> {
    return this._create(data, params);
  }

  async _get(id: ID, params?: Params): Promise<Result> {
    this.handleMethod('get');
    return this.resource.get(id, params).catch(this.handleError);
  }

  async get(id: ID, params?: Params): Promise<Result> {
    return this._get(id, params);
  }

  async _find(params?: Params): Promise<PaginatedResult> {
    this.handleMethod('find');
    const { data: result } = await this.resource
      .find(params)
      .catch(this.handleError);
    result.data = result.results;
    delete result.results;
    return result;
  }

  async find(params?: Params): Promise<PaginatedResult> {
    return this._find(params);
  }

  async _update(id: ID, data: Data, params?: Params): Promise<Result> {
    this.handleMethod('update');
    return this.resource.update(id, data, params).catch(this.handleError);
  }

  async update(id: ID, data: Data, params?: Params): Promise<Result> {
    return this._update(id, data, params);
  }

  async _patch(id: ID, data: Data, params?: Params): Promise<Result> {
    this.handleMethod('patch');
    return this._update(id, data, params);
  }

  async patch(id: ID, data: Data, params?: Params): Promise<Result> {
    return this._patch(id, data, params);
  }

  async _remove(id: ID, params?: Params): Promise<Result> {
    this.handleMethod('remove');
    return this.resource.remove(id, params).catch(this.handleError);
  }

  async remove(id: ID, params?: Params): Promise<Result> {
    return this._remove(id, params);
  }
}
