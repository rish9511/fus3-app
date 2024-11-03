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

type StaticBuckets map[string]map[string]string

func (f *FuseServer) ListBuckets(ctx context.Context, em *pb.EmptyMessage) (*pb.Buckets, error) {

	fmt.Println("Received request")
	sBuckets := loadStaticBuckets()

	return &pb.Buckets{
		AllBuckets: sBuckets[:],
	}, nil

}

func loadStaticBuckets() []*pb.Bucket {
	b1 := pb.Bucket{
		Name: "b1",
		Path: "/buckets/b1",
		Location: &pb.Location{
			Latitude:  123213,
			Longitude: 123123213,
		},
	}
	b2 := pb.Bucket{
		Name: "b2",
		Path: "/buckets/b2",
		Location: &pb.Location{
			Latitude:  123213,
			Longitude: 123123213,
		},
	}
	b3 := pb.Bucket{
		Name: "b3",
		Path: "/buckets/b3",
		Location: &pb.Location{
			Latitude:  123213,
			Longitude: 123123213,
		},
	}
	b4 := pb.Bucket{
		Name: "b4",
		Path: "/buckets/b4",
		Location: &pb.Location{
			Latitude:  123213,
			Longitude: 123123213,
		},
	}

	var buckets []*pb.Bucket
	buckets = append(buckets, &b1)
	buckets = append(buckets, &b2)
	buckets = append(buckets, &b3)
	buckets = append(buckets, &b4)
	return buckets
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
