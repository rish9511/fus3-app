const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

// Load the protobuf file
const packageDefinition = protoLoader.loadSync('/home/zboon/fus3-app/fuse_service/example.proto');
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// Get the service definition
const myService = protoDescriptor.fuse.Fuse

// Create a client instance
const client = new myService('localhost:50051', grpc.credentials.createInsecure());

// Call the RPC method
// client.MyMethod({ name: 'World' }, (error, response) => {
//   if (error) {
//     console.error('Error:', error);
//   } else {
//     console.log('Response:', response.message);
//   }
// });