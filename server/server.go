package main

import (
	"context"
	"fmt"
	"log"
	"net"

	pb "github.com/rish9511/fus3-app/fuse_service"
	"google.golang.org/grpc"
)

type FuseServer struct {
	pb.UnimplementedFuseServer
}

func (f *FuseServer) ListBuckets(ctx context.Context, em *pb.EmptyMessage) (*pb.Buckets, error) {

	fmt.Println("Received request")
	b1 := pb.Bucket{
		Name: "tempBucket",
	}

	buckets := [...]*pb.Bucket{&b1}

	return &pb.Buckets{
		AllBuckets: buckets[:],
	}, nil

}

func main() {

	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterFuseServer(s, &FuseServer{})

	fmt.Println("Server is running on port 50051")
	if err := s.Serve(listener); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}

}
