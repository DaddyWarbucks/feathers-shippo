import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoUserParcelTemplates extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'user-parcel-templates',
      methods: ['get', 'find', 'create', 'update', 'patch', 'remove']
    };
    super(options, app);
  }
}
