import {
  ShippoService,
  ServiceOptions,
  App,
  ID,
  Data,
  Params,
  shippoLimiters,
  axiosOpts
} from '../service';

export class ShippoServiceGroups extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'service-groups',
      methods: ['find', 'create', 'update', 'patch', 'remove']
    };
    super(options, app);
  }

  _update(id: ID, data: Data, params: Params) {
    return this.schedule('update', () => {
      data = {
        ...data,
        object_id: id
      };
      return this.shippo.put('service-groups', data, axiosOpts(params));
    });
  }
}
