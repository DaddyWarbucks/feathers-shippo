"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippoBatchService = exports.ShippoService = void 0;
const errors_1 = require("@feathersjs/errors");
const bottleneck_1 = __importDefault(require("bottleneck"));
const shippo_1 = __importDefault(require("shippo"));
;
[];
;
;
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
    const limiter = new bottleneck_1.default({ minTime });
    limiter.on('failed', (error, jobInfo) => __awaiter(void 0, void 0, void 0, function* () {
        if (error.code === 429 && jobInfo.retryCount === 0) {
            // Retry once after 200ms
            return 200;
        }
    }));
    return limiter;
};
const objectHas = (object, key) => {
    return Object.prototype.hasOwnProperty.call(object, key);
};
class ShippoService {
    constructor(options, app) {
        this.options = options;
        this.app = app;
        const { shippoKey, resource } = options;
        if (!shippoKey) {
            throw new errors_1.GeneralError('options.shippoKey is required for new ShippoService()');
        }
        if (!resource || objectHas(shippo_1.default, resource)) {
            throw new errors_1.GeneralError(`${resource} is invalid options.resource for new ShippoService()`);
        }
        this.shippoClient = (0, shippo_1.default)(shippoKey);
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
        return error;
        // TODO: Inspect the error and throw more specific
        // feathers errors.
        // if (error.code === 429) {
        //   throw new TooManyRequests(error);
        // }
        // throw new BadRequest(error);
    }
    schedule(method, fn) {
        if (this.options.limiters && this.options.limiters[method]) {
            return this.options.limiters[method].schedule(fn);
        }
        return fn();
    }
    _create(data, params) {
        if (!this.resource.operations.includes('create')) {
            throw new errors_1.MethodNotAllowed();
        }
        return this.schedule('create', () => this.resource.create(data).catch(this._handleError));
    }
    create(data, params) {
        return this._create(data, params);
    }
    _get(id, params) {
        if (!this.resource.operations.includes('retrieve')) {
            throw new errors_1.MethodNotAllowed();
        }
        return this.schedule('get', () => this.resource.retrieve(id).catch(this._handleError));
    }
    get(id, params) {
        return this._get(id, params);
    }
    _find(params) {
        if (!this.resource.operations.includes('list')) {
            throw new errors_1.MethodNotAllowed();
        }
        const find = (params) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.resource.list(params === null || params === void 0 ? void 0 : params.query);
            result.data = result.results;
            delete result.results;
            return result;
        });
        return this.schedule('find', () => find(params).catch(this._handleError));
    }
    find(params) {
        return this._find(params);
    }
    _update(id, data, params) {
        if (!this.resource.operations.includes('update')) {
            throw new errors_1.MethodNotAllowed();
        }
        return this.schedule('update', () => this.resource.update(id, data).catch(this._handleError));
    }
    update(id, data, params) {
        return this._update(id, data, params);
    }
}
exports.ShippoService = ShippoService;
class ShippoBatchService extends ShippoService {
    constructor(options, app) {
        options = Object.assign(Object.assign({}, options), { resource: 'batch' });
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
    addShipments(id, data) {
        return this.schedule('create', () => this.resource.add(id, data).catch(this._handleError));
    }
    removeShipments(id, data) {
        return this.schedule('create', () => this.resource.remove(id, data).catch(this._handleError));
    }
    purchase(id) {
        return this.schedule('create', () => this.resource.purchase(id).catch(this._handleError));
    }
}
exports.ShippoBatchService = ShippoBatchService;
class ShippoTrackService extends ShippoService {
    constructor(options, app) {
        super(options, app);
    }
}
