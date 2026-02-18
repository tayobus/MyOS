import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
    throw new Error('.env.local 파일에 Mongo URI를 추가해주세요');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
    // 개발 모드에서는 HMR(Hot Module Replacement)로 인해 모듈이 다시 로드될 때
    // 값이 유지되도록 전역 변수를 사용합니다.
    let globalWithMongo = global as typeof globalThis & {
        _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
} else {
    // 프로덕션 모드에서는 전역 변수를 사용하지 않는 것이 좋습니다.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

// 모듈 범위의 MongoClient 프라미스를 내보냅니다.
// 이렇게 하면 함수 간에 클라이언트를 공유할 수 있습니다.
export default clientPromise;
