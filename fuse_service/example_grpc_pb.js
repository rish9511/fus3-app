// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var example_pb = require('./example_pb.js');

function serialize_fuse_Buckets(arg) {
  if (!(arg instanceof example_pb.Buckets)) {
    throw new Error('Expected argument of type fuse.Buckets');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_fuse_Buckets(buffer_arg) {
  return example_pb.Buckets.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_fuse_EmptyMessage(arg) {
  if (!(arg instanceof example_pb.EmptyMessage)) {
    throw new Error('Expected argument of type fuse.EmptyMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_fuse_EmptyMessage(buffer_arg) {
  return example_pb.EmptyMessage.deserializeBinary(new Uint8Array(buffer_arg));
}


var FuseService = exports.FuseService = {
  listBuckets: {
    path: '/fuse.Fuse/ListBuckets',
    requestStream: false,
    responseStream: false,
    requestType: example_pb.EmptyMessage,
    responseType: example_pb.Buckets,
    requestSerialize: serialize_fuse_EmptyMessage,
    requestDeserialize: deserialize_fuse_EmptyMessage,
    responseSerialize: serialize_fuse_Buckets,
    responseDeserialize: deserialize_fuse_Buckets,
  },
};

exports.FuseClient = grpc.makeGenericClientConstructor(FuseService);
