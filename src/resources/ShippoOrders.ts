import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoOrders extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'orders',
      methods: ['get', 'find', 'create']
    };
    super(options, app);
  }
}
