const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');
var messages = require('../fuse_service/example_pb')

// Load the protobuf file
const packageDefinition = protoLoader.loadSync('/home/zboon/grpc-go/examples/route_guide/fuse_service/example.proto');
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);



// Get the service definition
const myService = protoDescriptor.fuse.Fuse

// Create a client instance
const client = new myService('localhost:50051', grpc.credentials.createInsecure());

var emptyMessage = new messages.EmptyMessage()

client.ListBuckets(emptyMessage, (error, response) => {
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Response:', response);
    }
});