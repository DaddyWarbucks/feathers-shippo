import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoShipments extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'shipments',
      methods: ['get', 'find', 'create']
    };
    super(options, app);
  }
}
