const {
  GeneralError,
  MethodNotAllowed,
  TooManyRequests
} = require('@feathersjs/errors');
const Bottleneck = require('bottleneck');
const shippo = require('shippo');

// https://goshippo.com/docs/rate-limits/
const calcMinTime = (perMinute) => 60000 / perMinute;

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
};

const shippoLimiter = (mode, resource, method) => {
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

const objectHas = (object, key) => {
  return Object.prototype.hasOwnProperty.call(object, key);
};

class ShippoService {
  constructor(options, app) {
    this.options = options || {};
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

  _handleError(error) {
    // TODO: Inspect the error and throw more specific
    // feathers errors.
    if (error.code === 429) {
      throw new TooManyRequests(error);
    }
    throw new GeneralError(error);
  }

  _schedule(method, fn) {
    if (this.options.limiters && this.options.limiters[method]) {
      return this.options.limiters[method].schedule(fn);
    }
    return fn();
  }

  _create(data, params) {
    if (!this.resource.operations.includes('create')) {
      throw new MethodNotAllowed();
    }
    return this._schedule('create', () =>
      this.resource.create(data).catch(this._handleError)
    );
  }

  create(data, params) {
    return this._create(data, params);
  }

  _get(id, params) {
    if (!this.resource.operations.includes('retrieve')) {
      throw new MethodNotAllowed();
    }
    return this._schedule('get', () =>
      this.resource.retrieve(id).catch(this._handleError)
    );
  }

  get(id, params) {
    return this._get(id, params);
  }

  _find(params) {
    if (!this.resource.operations.includes('list')) {
      throw new MethodNotAllowed();
    }
    const find = async (params) => {
      const result = await this.resource.list(params.query);
      result.data = result.results;
      delete result.results;
      return result;
    };
    return this._schedule('find', () => find(params).catch(this._handleError));
  }

  find(params) {
    return this._find(params);
  }

  _update(id, data, params) {
    if (!this.resource.operations.includes('update')) {
      throw new MethodNotAllowed();
    }
    return this._schedule('update', () =>
      this.resource.update(id, data).catch(this._handleError)
    );
  }

  update(id, data, params) {
    return this._update(id, data, params);
  }
}

class ShippoBatchService extends ShippoService {
  constructor(options, app) {
    super(options, app);
  }

  // get() {

  // }

  addShipments(id, data) {
    return this._schedule('create', () =>
      this.resource.add(id, data).catch(this._handleError)
    );
  }

  removeShipments(id, data) {
    return this._schedule('create', () =>
      this.resource.remove(id, data).catch(this._handleError)
    );
  }

  purchase(id) {
    return this._schedule('create', () =>
      this.resource.purchase(id).catch(this._handleError)
    );
  }
}

class ShippoTrackService extends ShippoService {
  constructor(options, app) {
    super(options, app);
  }

  addShipments(id, data) {
    return this._schedule('create', () =>
      this.resource.add(id, data).catch(this._handleError)
    );
  }

  removeShipments(id, data) {
    return this._schedule('create', () =>
      this.resource.remove(id, data).catch(this._handleError)
    );
  }

  purchase(id) {
    return this._schedule('create', () =>
      this.resource.purchase(id).catch(this._handleError)
    );
  }
}

module.exports.ShippoService = ShippoService;
module.exports.ShippoBatchService = ShippoBatchService;
