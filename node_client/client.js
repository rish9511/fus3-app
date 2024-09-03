const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const {EmptyMessage} = require('../fuse_service/fuseservice_pb')
const {FuseClient} = require('../fuse_service/fuseservice_grpc_web_pb');
const { cli } = require('webpack');

// Load the protobuf file
// const packageDefinition = protoLoader.loadSync('../fuse_service/fuseservice.proto');
// const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
// Get the service definition
// const myService = protoDescriptor.fuse.Fuse

// Create a client instance
const client = new FuseClient('localhost:50051', grpc.credentials.createInsecure());

var emptyMessage = new EmptyMessage()

client.listBuckets(emptyMessage, {}, (error, response) => {
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Response:', response);
    }
});