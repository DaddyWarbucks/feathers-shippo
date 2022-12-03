import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoManifests extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'manifests',
      methods: ['get', 'find', 'create']
    };
    super(options, app);
  }
}
