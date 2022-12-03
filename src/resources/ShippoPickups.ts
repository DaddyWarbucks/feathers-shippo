import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoPickups extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'pickups',
      methods: ['create']
    };
    super(options, app);
  }
}
