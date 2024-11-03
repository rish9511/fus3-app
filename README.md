**How to build**


- Regenerate protobuf code for Go : protoc --go_out=./ --go_opt=paths=source_relative --go-grpc_out=./ --go-grpc_opt=paths=source_relative ./fuse_service/fuseservice.proto



- Regenrate protobuf code fo Js : protoc -I=./fuse_service fuse_service/fuseservice.proto  --js_out=import_style=commonjs:./fuse_service   --grpc-web_out=import_style=commonjs,mode=grpcwebtext:./fuse_service


- Generate bundle file : `browserify main.js -p esmify -o bundle.js`