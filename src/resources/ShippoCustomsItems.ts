import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoCustomsItems extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'customs/items',
      methods: ['get', 'find', 'create']
    };
    super(options, app);
  }
}
