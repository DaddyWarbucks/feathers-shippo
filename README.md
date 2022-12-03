# feathers-shippo

A FeathersJS adapter for the [Shippo](https://goshippo.com) API. For more information, visit the [Shippo API Docs](https://goshippo.com/docs/intro) and [Shippo API Reference](https://goshippo.com/docs/reference). This library automatically handles rate limits by using `bottleneck` under the hood.

```js
import { ShippoShipmentsService } from 'feathers-shippo';

const options = {
  token: 'YOUR_SHIPPO_TOKEN'
}

app.use('shipments', new ShippoShipmentsService(options, app));


const shipments = await app.service('shipments').find({
  query: {
    results: 10,
    object_created_gt: '2023-01-01'
  }
});
```

Most services are a light wrapper around the corresponding Shippo resource. Some services implement custom `params.query` and custom methods to accomodate certain Shippo actions. To learn more about each service's capabilities, view the service's source code and read the [Shippo API Reference](https://goshippo.com/docs/reference). Note this library does not try to implement the Feathers Common query syntax, instead `params.query` is passed directly to Shippo.

- ShippoAddresses
- ShippoBatches
- ShippoCarrierAccounts
- ShippoCarrierParcelTemplates
- ShippoCustomsDeclarations
- ShippoCustomsItems
- ShippoManifests
- ShippoOrders
- ShippoParcels
- ShippoPickups
- ShippoRates
- ShippoRefunds
- ShippoServiceGroups
- ShippoShipments
- ShippoTracks
- ShippoTransactions
- ShippoUserParcelTemplates

The library also exports some utility functions and classes
- ShippoServce
- shippo

## Rate Limits
All services adhere to Shippo's test/live rate limits. The limits are determined by the `options.token`. You can also disable or pass your own rate limiters.
```js
import { ShippoShipmentsService } from 'feathers-shippo';
import Bottleneck from 'bottleneck';

 // disable rate limiting
const options = {
  token: 'YOUR_SHIPPO_TOKEN',
  limiters: null
}

// provide custom limiters
const options = {
  token: 'YOUR_SHIPPO_TOKEN',
  limiters: {
    get: new Bottleneck({ ... }) // GET/:id
    find: new Bottleneck({ ... }) // GET
    create: new Bottleneck({ ... }) // POST
    update: new Bottleneck({ ... }) // PUT
    remove: new Bottleneck({ ... }) // DELETE
  }
}

app.use('shipments', new ShippoShipmentsService(options, app));
```

## ShippoService
You generally won't need to use this service directly, but its available to you. It is the base class used to create all other services.
```js
import { ShippoService } from 'feathers-shippo';

const options = {
  token: 'YOUR_SHIPPO_TOKEN',
  path: 'shipments',
  methods: ['get', 'find', 'create']
}

app.use('shipments', new ShippoService(options, app));
```

## Shippo Client
The `shippo` function creates a new `axios` instance with the Shippo API `baseURL` and `Authorization` header. It is used under the hood for all service requests. It is exported for you to handle any Shippo functionality not covered by this library. This client does not handle rate limiting.
```js
import { shippo } from 'feathers-shippo';

const shippoClient = shippo('YOUR_SHIPPO_TOKEN');
```