import { ShippoService, ServiceOptions, App, shippoLimiters } from '../service';

export class ShippoShipments extends ShippoService {
  constructor(options: ServiceOptions, app: App) {
    options = {
      limiters: shippoLimiters(options.token),
      ...options,
      path: 'shipments',
      methods: ['get', 'find', 'create']
    };
    super(options, app);
  }

//   get(id: ID, params?: Params) {
//     if (!id) {
//       throw new BadRequest('ID is required');
//     }
//     if (params?.query?.rates) {
//       return this.schedule('get', () => {
//         return this.shippo
//           .get(`shipments/${id}/rates/${params?.query?.rates}`)
//           .then(this.handleResult)
//           .catch(this.handleError);
//       });
//     }
//     return super.get(id, params);
//   }
// }
