import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoCarrierParcelTemplates extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'parcel-templates',
      methods: ['get', 'find']
    };
    super(options, app);
  }
}
