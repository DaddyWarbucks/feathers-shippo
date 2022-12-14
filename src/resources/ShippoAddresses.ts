import {
  ShippoService,
  ServiceOptions,
  ID,
  Params,
  App,
  shippoLimiters
} from '../service';

interface AddressesParams extends Params {
  query: {
    validate?: string;
  };
}

export class ShippoAddresses extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'addresses',
      methods: ['get', 'find', 'create']
    };
    super(options, app);
  }

  _get(id: ID, params?: AddressesParams) {
    if (params?.query?.validate) {
      const shippoParams = { ...params, query: { ...params.query } } as any;
      delete shippoParams.query.validate;
      return this.resource
        .get(`${id}/validate`, shippoParams)
        .then(this.handleResult)
        .catch(this.handleError);
    }
    return super._get(id, params);
  }
}
