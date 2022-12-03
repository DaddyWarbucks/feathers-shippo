import { BadRequest } from '@feathersjs/errors';
import {
  ShippoService,
  ServiceOptions,
  ID,
  Params,
  App,
  axiosOpts,
  shippoLimiters
} from '../service';

interface RatesParams extends Params {
  query: {
    shipment: ID;
    rates: string;
  };
}

export class ShippoRates extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'rates',
      methods: ['get', 'find']
    };
    super(options, app);
  }

  _find(params?: RatesParams) {
    if (!params?.query?.shipment || !params?.query?.rates) {
      throw new BadRequest(
        'params.query.shipment and params.query.rates are required for Shippo rates'
      );
    }
    const shippoParams = { ...params, query: { ...params.query } } as any;
    delete shippoParams.query.shipment;
    delete shippoParams.query.rates;
    return this.schedule('get', () => {
      return this.shippo.get(
        `shipments/${params?.query?.shipment}/rates/${params?.query?.rates}`,
        axiosOpts(shippoParams)
      );
    });
  }
}
