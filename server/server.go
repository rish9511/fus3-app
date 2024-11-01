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

	sBuckets := loadStaticBuckets()

	/*
		{
			'Bucket1': {
				'Name': 'xyz'
				'Path': 'abc'
			}
		}
	*/

	var buckets []*pb.Bucket
	for _, v := range sBuckets {
		bucket := pb.Bucket{
			Name: v["Name"],
			Path: v["Path"],
		}

		buckets = append(buckets, &bucket)

	}

	fmt.Println("Received request")
	// b1 := pb.Bucket{
	// 	Name: "tempBucket",
	// }

	// buckets := [...]*pb.Bucket{&b1}

	return &pb.Buckets{
		AllBuckets: buckets[:],
	}, nil

}

func loadStaticBuckets() StaticBuckets {
	buckets := make(StaticBuckets)
	buckets["Bucket1"] = make(map[string]string)
	buckets["Bucket2"] = make(map[string]string)

	buckets["Bucket1"]["Name"] = "B1"
	buckets["Bucket1"]["Path"] = "/buckets/b1"
	// buckets["Bucket1"]["Latitude"] = "12.345"
	// buckets["Bucket1"]["Longitude"] = "0"

	buckets["Bucket2"]["Name"] = "B2"
	buckets["Bucket2"]["Path"] = "/buckets/b2"
	// buckets["Bucket2"]["Latitude"] = "40.345"
	// buckets["Bucket2"]["Longitude"] = "0"

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
