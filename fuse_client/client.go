package main

import (
	"context"
	"flag"
	"fmt"
	"log"

	pb "github.com/rish9511/fus3-app/fuse_service"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	serverAddr = flag.String("addr", "localhost:50051", "The server address in the format of host:port")
)

func main() {
	// Establish a connection to the gRPC server
	var opts []grpc.DialOption
	opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	conn, err := grpc.NewClient(*serverAddr, opts...)
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()

	// Create a new client
	client := pb.NewFuseClient(conn)

	em := &pb.EmptyMessage{}
	bl, err := client.ListBuckets(context.Background(), em)
	if err != nil {
		log.Fatalf("Failed to list buckets: %v", err)
	}
	fmt.Println(bl.AllBuckets)

	// Call the RPC method
	// req := &pb.MyRequest{Name: "World"}
	// resp, err := client.MyMethod(context.Background(), req)
	// if err != nil {
	// 	log.Fatalf("could not greet: %v", err)
	// }

	// // Print the response
	// fmt.Printf("Greeting: %s\n", resp.GetMessage())
}
