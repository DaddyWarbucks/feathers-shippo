import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoTransactions extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'transactions',
      methods: ['get', 'find', 'create']
    };
    super(options, app);
  }
}
