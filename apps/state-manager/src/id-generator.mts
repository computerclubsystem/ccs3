import objId from 'bson-objectid';

export class IdGenerator {
    generate(): string {
        const res = objId.default();
        return res.toHexString();
    }
}
