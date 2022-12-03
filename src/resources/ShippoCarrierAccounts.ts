import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoCarrierAccounts extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'carrier_accounts',
      methods: ['get', 'find', 'create', 'update', 'patch']
    };
    super(options, app);
  }
}
