import { Application } from '@feathersjs/feathers';
interface ServiceOptions {
    shippoKey: string;
    resource: string;
    limiters?: false | {
        create: any;
        update: any;
        get: any;
        find: any;
    };
}
type ID = string;
interface Data {
    [key: string]: any;
}
interface Params {
    [key: string]: any;
    query: {
        [key: string]: any;
        results?: number | undefined;
        page?: number | undefined;
    };
}
interface PaginatedResult {
    count: `${number}`;
    next: string | null;
    previous: string | null;
    data: [];
}
interface Result {
    [key: string]: any;
}
export declare class ShippoService {
    options: ServiceOptions;
    app: Application;
    shippoClient: any;
    resource: any;
    constructor(options: ServiceOptions, app: Application);
    _handleError(error: any): any;
    schedule(method: 'create' | 'update' | 'get' | 'find', fn: Function): any;
    _create(data: Data, params?: Params): Promise<Result>;
    create(data: Data, params?: Params): Promise<Result>;
    _get(id: ID, params?: Params): Promise<Result>;
    get(id: ID, params?: Params): Promise<Result>;
    _find(params?: Params): Promise<PaginatedResult>;
    find(params?: Params): Promise<PaginatedResult>;
    _update(id: ID, data: Data, params?: Params): Promise<Result>;
    update(id: ID, data: Data, params?: Params): Promise<Result>;
}
export declare class ShippoBatchService extends ShippoService {
    constructor(options: ServiceOptions, app: Application);
    addShipments(id: ID, data: Data): any;
    removeShipments(id: ID, data: Data): any;
    purchase(id: ID): any;
}
export {};
