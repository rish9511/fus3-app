/**
 * @fileoverview gRPC-Web generated client stub for fuse
 * @enhanceable
 * @public
 */

// Code generated by protoc-gen-grpc-web. DO NOT EDIT.
// versions:
// 	protoc-gen-grpc-web v1.5.0
// 	protoc              v5.27.3
// source: fuseservice.proto


/* eslint-disable */
// @ts-nocheck



const grpc = {};
grpc.web = require('grpc-web');

const proto = {};
proto.fuse = require('./fuseservice_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.fuse.FuseClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options.format = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname.replace(/\/+$/, '');

};


/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.fuse.FusePromiseClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options.format = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname.replace(/\/+$/, '');

};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.fuse.EmptyMessage,
 *   !proto.fuse.Buckets>}
 */
const methodDescriptor_Fuse_ListBuckets = new grpc.web.MethodDescriptor(
  '/fuse.Fuse/ListBuckets',
  grpc.web.MethodType.UNARY,
  proto.fuse.EmptyMessage,
  proto.fuse.Buckets,
  /**
   * @param {!proto.fuse.EmptyMessage} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.fuse.Buckets.deserializeBinary
);


/**
 * @param {!proto.fuse.EmptyMessage} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.fuse.Buckets)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.fuse.Buckets>|undefined}
 *     The XHR Node Readable Stream
 */
proto.fuse.FuseClient.prototype.listBuckets =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/fuse.Fuse/ListBuckets',
      request,
      metadata || {},
      methodDescriptor_Fuse_ListBuckets,
      callback);
};


/**
 * @param {!proto.fuse.EmptyMessage} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.fuse.Buckets>}
 *     Promise that resolves to the response
 */
proto.fuse.FusePromiseClient.prototype.listBuckets =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/fuse.Fuse/ListBuckets',
      request,
      metadata || {},
      methodDescriptor_Fuse_ListBuckets);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.fuse.FileTransferInput,
 *   !proto.fuse.FileTransferOutput>}
 */
const methodDescriptor_Fuse_CopyFile = new grpc.web.MethodDescriptor(
  '/fuse.Fuse/CopyFile',
  grpc.web.MethodType.SERVER_STREAMING,
  proto.fuse.FileTransferInput,
  proto.fuse.FileTransferOutput,
  /**
   * @param {!proto.fuse.FileTransferInput} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.fuse.FileTransferOutput.deserializeBinary
);


/**
 * @param {!proto.fuse.FileTransferInput} request The request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!grpc.web.ClientReadableStream<!proto.fuse.FileTransferOutput>}
 *     The XHR Node Readable Stream
 */
proto.fuse.FuseClient.prototype.copyFile =
    function(request, metadata) {
  return this.client_.serverStreaming(this.hostname_ +
      '/fuse.Fuse/CopyFile',
      request,
      metadata || {},
      methodDescriptor_Fuse_CopyFile);
};


/**
 * @param {!proto.fuse.FileTransferInput} request The request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!grpc.web.ClientReadableStream<!proto.fuse.FileTransferOutput>}
 *     The XHR Node Readable Stream
 */
proto.fuse.FusePromiseClient.prototype.copyFile =
    function(request, metadata) {
  return this.client_.serverStreaming(this.hostname_ +
      '/fuse.Fuse/CopyFile',
      request,
      metadata || {},
      methodDescriptor_Fuse_CopyFile);
};


module.exports = proto.fuse;

