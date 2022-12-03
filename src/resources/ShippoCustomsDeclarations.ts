import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoCustomsDeclarations extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'customs/declarations',
      methods: ['get', 'find', 'create']
    };
    super(options, app);
  }
}
