import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoParcels extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'parcels',
      methods: ['get', 'find', 'create']
    };
    super(options, app);
  }
}
