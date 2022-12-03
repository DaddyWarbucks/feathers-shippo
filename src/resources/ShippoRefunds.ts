import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoRefunds extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'refunds',
      methods: ['get', 'find', 'create']
    };
    super(options, app);
  }
}
